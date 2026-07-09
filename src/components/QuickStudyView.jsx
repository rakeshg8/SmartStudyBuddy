import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useParams} from 'react-router-dom';
import { supabase } from '../supabase/client';
import { AuthContext } from '../context/AuthContext';
import { extractTextFromPDF } from '../utils/pdfUtils';
import { chunkText } from '../utils/chunker';
import { extractTextFromHandwritten } from '../utils/ocrUtils';

export default function QuickStudyView() {
    const { id } = useParams(); // new line
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [study, setStudy] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [quickStudyId, setQuickStudyId] = useState(null);
const [activeTab, setActiveTab] = useState('chat'); // chat | exam
  const [loading, setLoading] = useState(false); // new
  // 🟩 Fetch saved chats once quickStudyId is set
  useEffect(() => {
    if (!quickStudyId) return;
    fetchChatHistory();
  }, [quickStudyId]);
 useEffect(() => {
    if (id) {
      setQuickStudyId(id);
      fetchChatHistory(id);
      fetchDocument(id);
    }
  }, [id]);
  useEffect(() => {
  if (id) {
    fetchStudy();
    setQuickStudyId(id);
  }
}, [id]);
async function fetchStudy() {
  const { data, error } = await supabase
    .from("quick_studies")
    .select("*")
    .eq("id", id)
    .single();
  if (!error) setStudy(data);
}

  async function fetchChatHistory(studyId = quickStudyId) {
    if (!studyId) return;
    const { data, error } = await supabase
      .from('quick_chats')
      .select('*')
      .eq('quick_study_id', studyId)
      .order('ts', { ascending: true });
    if (error) console.error(error);
    else setMessages((data || []).map(d => ({ ...d, text: d.text || '' })));
  }

async function fetchDocument(studyId = quickStudyId) {
  if (!studyId) return;
  const { data, error } = await supabase
    .from('quick_documents')
    .select('*')
    .eq('quick_study_id', studyId)
    .maybeSingle();
  if (data) setSelectedDoc(data);
}
  async function ensureQuickStudySession() {
    if (quickStudyId) return quickStudyId;

    // Rate Limit check: max 5 Quick Study sessions per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: sessionCount, error: countErr } = await supabase
      .from('quick_studies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneHourAgo);

    if (countErr) {
      console.error("Error checking Quick Study session count:", countErr);
    } else if (sessionCount >= 5) {
      const errMsg = "Upload rate limit exceeded. You can create a maximum of 5 Quick Study sessions per hour.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    let { data: qs, error: qsErr } = await supabase
      .from('quick_studies')
      .insert({ user_id: user.id })
      .select().single();

    if (qsErr) {
      alert(qsErr.message);
      throw qsErr;
    }
    setQuickStudyId(qs.id);
    navigate(`/quickstudy/${qs.id}`, { replace: true });
    return qs.id;
  }

  async function handleFileInput(e) {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploadProgress(10);
    let studyId;
    try {
      studyId = await ensureQuickStudySession();
    } catch (err) {
      setUploadProgress(0);
      return;
    }

    // Limit check: max 5 documents per Quick Study session
    const { count: docCount, error: docCountErr } = await supabase
      .from('quick_documents')
      .select('*', { count: 'exact', head: true })
      .eq('quick_study_id', studyId);

    if (docCountErr) {
      console.error("Error checking documents count:", docCountErr);
    } else if (docCount >= 5) {
      alert("Upload rate limit exceeded. You can upload a maximum of 5 documents per Quick Study session.");
      setUploadProgress(0);
      return;
    }

    // 2️⃣ Upload file
    const ext = file.name.split('.').pop();
    const path = `quick_studies/${studyId}/${Date.now()}.${ext}`;
    setUploadProgress(30);
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file);
    if (upErr) {
      alert(upErr.message);
      setUploadProgress(0);
      return;
    }

    const publicUrl = supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
    await new Promise(res => setTimeout(res, 100)); // 100ms

    // 3️⃣ Create quick document record
    const { data: doc, error: docErr } = await supabase.from('quick_documents').insert({
      quick_study_id: studyId,
      file_url: publicUrl,
      filename: file.name,
      type: 'pdf'
    }).select().single();
    
    if (docErr || !doc?.id) {
      console.error("Quick document not created:", docErr);
      alert(docErr?.message || "Failed to create document record.");
      setUploadProgress(0);
      return;
    }
    
    setSelectedDoc(doc);
    setUploadProgress(50);

    function cleanText(text) {
      if (!text) return '';
      return text.replace(/[\x00-\x1F\x7F]/g, '').trim();
    }

    // 4️⃣ Extract PDF text, chunk, and send embeddings
    try {
      const pages = await extractTextFromPDF(file);
      let totalChunks = 0, processedChunks = 0;
      for (const p of pages) totalChunks += chunkText(p.text, 200).length;
      for (const p of pages) {
        const chunks = chunkText(p.text, 200).map(c => cleanText(c)).filter(c => c.length > 0);
        for (const chunk of chunks) {
          await fetch('https://smart-study-buddy-six.vercel.app/api/embeddings', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              quick_study_id: studyId,
              document_id: doc.id,
              page_number: p.pageNumber,
              chunk_text: chunk
            })
          }).catch(err => console.error(err));
          processedChunks++;
          setUploadProgress(50 + Math.round((processedChunks / totalChunks) * 50));
        }
      }
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 2000);
      alert('File uploaded and processed (embeddings created).');
    } catch (extractErr) {
      console.error("PDF text extraction failed:", extractErr);
      alert(extractErr.message || "Failed to extract text from PDF.");
      setUploadProgress(0);
      await supabase.from('quick_documents').delete().eq('id', doc.id);
    }
  }

  async function handleHandwrittenInput(e) {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    setUploadProgress(10);
    let studyId;
    try {
      studyId = await ensureQuickStudySession();
    } catch (err) {
      setUploadProgress(0);
      return;
    }

    // Limit check: max 5 documents per Quick Study session
    const { count: docCount, error: docCountErr } = await supabase
      .from('quick_documents')
      .select('*', { count: 'exact', head: true })
      .eq('quick_study_id', studyId);

    if (docCountErr) {
      console.error("Error checking documents count:", docCountErr);
    } else if (docCount >= 5) {
      alert("Upload rate limit exceeded. You can upload a maximum of 5 documents per Quick Study session.");
      setUploadProgress(0);
      return;
    }

    // Upload file to Supabase storage
    const ext = file.name.split('.').pop();
    const path = `quick_studies/${studyId}/handwritten_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file);
    if (upErr) {
      alert(upErr.message);
      setUploadProgress(0);
      return;
    }
    
    const publicUrl = supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;

    // Create DB record
    const { data: doc, error: docErr } = await supabase.from('quick_documents').insert({
      quick_study_id: studyId,
      file_url: publicUrl,
      filename: file.name,
      type: 'handwritten'
    }).select().single();
    
    if (docErr || !doc?.id) {
      console.error("Quick handwritten document not created:", docErr);
      alert(docErr?.message || "Failed to create document record.");
      setUploadProgress(0);
      return;
    }
    
    setSelectedDoc(doc);
    setUploadProgress(50);

    // Extract text using OCR
    try {
      const extractedText = await extractTextFromHandwritten(file);
      setUploadProgress(70);

      // Split and send chunks to embeddings
      const chunks = chunkText(extractedText, 200);
      for (let i = 0; i < chunks.length; i++) {
        await fetch('https://smart-study-buddy-six.vercel.app/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quick_study_id: studyId,
            document_id: doc.id,
            page_number: 1,
            chunk_text: chunks[i]
          })
        });
        setUploadProgress(Math.round(70 + ((i+1)/chunks.length)*30));
      }
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 2000);
      alert('Handwritten notes uploaded and processed successfully!');
    } catch (ocrErr) {
      console.error("OCR failed:", ocrErr);
      alert(ocrErr.message || "Failed to extract text from file.");
      setUploadProgress(0);
      await supabase.from('quick_documents').delete().eq('id', doc.id);
    }
  }

  async function askQuestion() {
    if (!quickStudyId) {
      console.error("Quick Study ID is missing");
      return;
    }

    if (!query.trim()) return;
    const uMsg = { role: 'user', text: query, ts: Date.now() };
    setMessages(prev => [...prev, uMsg]);
    setQuery('');

    // show loading indicator in chat
    const loadingMsg = { role: 'assistant', text: 'Generating, please wait...', ts: Date.now(), loading: true };
    setMessages(prev => [...prev, loadingMsg]);
    setLoading(true);

    // 🟩 Save user message
    await supabase.from('quick_chats').insert({
      quick_study_id: quickStudyId,
      role: 'user',
      text: uMsg.text,
      ts: uMsg.ts
    });

    try {
      const res = await fetch('https://smart-study-buddy-six.vercel.app/api/query', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ quick_study_id: quickStudyId, question: uMsg.text })
      });
      
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP error ${res.status}`);
      }

      const aMsg = { role: 'assistant', text: json.answer, sources: json.sources, ts: Date.now() };
      // remove the loading message and add the real answer
      setMessages(prev => {
        const withoutLoading = prev.filter(m => !m.loading);
        return [...withoutLoading, aMsg];
      });
      // 🟩 Save assistant response
      await supabase.from('quick_chats').insert({
        quick_study_id: quickStudyId,
        role: 'assistant',
        text: json.answer,
        sources: json.sources || null,
        ts: aMsg.ts
      });
    } catch (err) {
      console.error("Error asking question in quick study:", err);
      const errorText = `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again later.`;
      const errorMsg = { role: 'assistant', text: errorText, ts: Date.now() };
      setMessages(prev => {
        const withoutLoading = prev.filter(m => !m.loading);
        return [...withoutLoading, errorMsg];
      });
      await supabase.from('quick_chats').insert({
        quick_study_id: quickStudyId,
        role: 'assistant',
        text: errorText,
        ts: errorMsg.ts
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn mb-4" onClick={() => navigate("/")}>
        ← Back to Dashboard
      </button>
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6 flex flex-col">

      <h2 className="text-2xl mb-4">
  {study?.title ? study.title : "Quick Study ⚡"}
</h2>


      <div className="flex flex-col lg:flex-row gap-6 w-full mt-4">
  {/* 📄 Left Section - PDF Viewer & Upload */}
  <div className="flex-1 bg-gray-800 rounded-2xl p-4 shadow-lg">
    {uploadProgress > 0 && (
      <div className="w-full bg-gray-700 rounded mb-3 h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
    )}

    <div className="flex flex-col gap-4 mb-4">
  <label
    htmlFor="fileInput"
    className="cursor-pointer btn"
  >
    📤 Upload PDF
  </label>
  <input
    id="fileInput"
    type="file"
    accept="application/pdf"
    onChange={handleFileInput}
    className="hidden"
  />

  <label
    htmlFor="handwrittenInput"
    className="cursor-pointer btn"
  >
    📝 Upload Handwritten Notes
  </label>
  <input
    id="handwrittenInput"
    type="file"
    accept="application/pdf,image/*"
    onChange={handleHandwrittenInput}
    className="hidden"
  />


</div>


    {selectedDoc ? (
      <iframe
        src={selectedDoc.file_url}
        className="w-full h-[75vh] rounded-xl border-none"
        title="PDF Viewer"
      />
    ) : (
      <p className="text-gray-400 italic text-center mt-6">
        Upload a PDF to start your Quick Study.
      </p>
    )}
  </div>
{/* 💬 Right Section - Chat / Exam */}
<div className="flex-1 flex flex-col bg-gray-800 rounded-2xl p-4 shadow-lg">
  {/* Tabs */}
  <div className="flex gap-2 mb-4">
    <button
      className={`btn ${activeTab === 'chat' ? 'bg-indigo-600' : ''}`}
      onClick={() => setActiveTab('chat')}
    >
      Chat
    </button>
    <button
      className={`btn ${activeTab === 'exam' ? 'bg-indigo-600' : ''}`}
      onClick={() => setActiveTab('exam')}
    >
      Exam Mode
    </button>
  </div>

  {/* Tab Content */}
  {activeTab === 'chat' && (
    <div className="flex-1 flex flex-col">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2" style={{ maxHeight: '75vh' }}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block p-3 rounded-2xl max-w-[80%] shadow-md ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              } break-words`}
            >
              <div dangerouslySetInnerHTML={{ __html: (m.text || '').replace(/\n/g, '<br/>') }} />
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex w-full">
        <input
          className="flex-1 p-3 rounded-l-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-900 text-gray-100 placeholder-gray-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your PDF..."
        />
        <button
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 rounded-r-xl transition-all duration-200 shadow-md"
          onClick={askQuestion}
        >
          Ask
        </button>
      </div>
    </div>
  )}

  {activeTab === 'exam' && (
    <div>
      <h3 className="font-semibold mb-2">Exam Mode</h3>
      <p className="text-sm text-gray-400 mb-3">Generate a timed quiz from your Quick Study.</p>
      <button className="btn" onClick={async () => {
        const resp = await fetch('https://smart-study-buddy-six.vercel.app/api/query', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ quick_study_id: quickStudyId, question: '::generate_quiz::', mode: 'quiz' })
        });
        const j = await resp.json();
        setActiveTab('chat'); // show generated quiz in chat
        setMessages(prev => [...prev, { role:'assistant', text: j.answer, sources: j.sources }]);
      }}>
        Generate Quiz
      </button>
    </div>
  )}
</div>


  
 
</div>

    </div>
    </div>
  );
}
