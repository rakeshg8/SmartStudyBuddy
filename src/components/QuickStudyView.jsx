import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useParams} from 'react-router-dom';
import { supabase } from '../supabase/client';
import { AuthContext } from '../context/AuthContext';
import { extractTextFromPDF } from '../utils/pdfUtils';
import { chunkText } from '../utils/chunker';
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
  else setMessages(data);
}

async function fetchDocument(studyId = quickStudyId) {
  const { data, error } = await supabase
    .from('quick_documents')
    .select('*')
    .eq('quick_study_id', studyId)
    .single();
  if (data) setSelectedDoc(data);
}

  async function handleFileInput(e) {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploadProgress(10);

    // 1️⃣ Create quick study session
    let { data: qs, error: qsErr } = await supabase
      .from('quick_studies')
      .insert({ user_id: user.id })
      .select().single();
console.log("Quick study insert result:", qs, qsErr);

    if (qsErr) return alert(qsErr.message);
    setQuickStudyId(qs.id);
console.log(await supabase.auth.getSession());

    // 2️⃣ Upload file
    const ext = file.name.split('.').pop();
    const path = `quick_studies/${qs.id}/${Date.now()}.${ext}`;
    setUploadProgress(30);
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file);
    if (upErr) return alert(upErr.message);

    const publicUrl = supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
    await new Promise(res => setTimeout(res, 100)); // 100ms


    // 3️⃣ Create quick document record
    const { data: doc, error: docErr } = await supabase.from('quick_documents').insert({
      quick_study_id: qs.id,
      file_url: publicUrl,
      filename: file.name
    }).select().single();
    setSelectedDoc(doc);
    setUploadProgress(50);
if (!doc?.id) {
  console.error("Quick document not created, cannot send embeddings:", doc, docErr);
  return;
}
const studyId = qs.id; 
function cleanText(text) {
  if (!text) return '';
  // Remove null bytes and other control characters
  return text.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

    // 4️⃣ Extract PDF text, chunk, and send embeddings
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
  }

  async function askQuestion() {
    if (!quickStudyId) {
  console.error("Quick Study ID is missing");
  return;
}

    if (!query.trim() || !quickStudyId) return;
    const uMsg = { role: 'user', text: query, ts: Date.now() };
    setMessages(prev => [...prev, uMsg]);
    setQuery('');

    // 🟩 Save user message
    await supabase.from('quick_chats').insert({
      quick_study_id: quickStudyId,
      role: 'user',
      text: uMsg.text,
      ts: uMsg.ts
    });
    const res = await fetch('https://smart-study-buddy-six.vercel.app/api/query', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ quick_study_id: quickStudyId, question: uMsg.text })
    });
    const json = await res.json();
    
    const aMsg = { role: 'assistant', text: json.answer, sources: json.sources, ts: Date.now() };
setMessages(prev => [...prev, aMsg]);
    
    // 🟩 Save assistant response
    await supabase.from('quick_chats').insert({
      quick_study_id: quickStudyId,
      role: 'assistant',
      text: json.answer,
      sources: json.sources,
      ts: aMsg.ts
    });
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

    <label
      htmlFor="fileInput"
      className="cursor-pointer inline-block bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl mb-4 font-medium shadow transition-all"
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
<button className="btn" onClick={() => setActiveTab('exam')}>
  Exam Mode
</button>
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

  {/* 💬 Right Section - Chat */}
  <div className="flex-1 flex flex-col bg-gray-800 rounded-2xl p-4 shadow-lg">
    <div
      className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2"
      style={{ maxHeight: '75vh' }}
    >
      {messages.map((m, i) => (
        <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
          <div
            className={`inline-block p-3 rounded-2xl max-w-[80%] shadow-md ${
              m.role === 'user'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                : 'bg-gray-700 text-gray-100'
            } break-words`}
          >
            <div
              dangerouslySetInnerHTML={{
                __html: (m.text || '').replace(/\n/g, '<br/>'),
              }}
            />
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
</div>

    </div>
    </div>
  );
}
