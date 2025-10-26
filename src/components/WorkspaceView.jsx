// src/pages/WorkspaceView.jsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { AuthContext } from '../context/AuthContext';
import { extractTextFromPDF } from '../utils/pdfUtils';
import { chunkText } from '../utils/chunker';
import { extractTextFromHandwritten } from '../utils/ocrUtils';
import { useNavigate } from "react-router-dom";
export default function WorkspaceView() {
  const { id } = useParams(); // workspace id
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]); // chat messages
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // chat | exam | notes | concept
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
const [selectedDoc, setSelectedDoc] = useState(null);
const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    fetchWorkspace();
  }, [id]);
useEffect(() => {
  if (!id || !user) return;
  fetchChatHistory();
}, [id, user]);

async function fetchChatHistory() {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('workspace_id', id)
    .order('ts', { ascending: true });

  if (!error && data) {
    setMessages(
      data.map(d => ({
        role: d.role,
        text: d.text,
        sources: d.sources || null,
        ts: new Date(d.ts).getTime(),
      }))
    );
  }
}

  useEffect(() => {
    // start reading timer on mount
    startTimer();
    return () => stopTimerAndSave();
    // eslint-disable-next-line
  }, [id]);
// --- replace fetchWorkspace, stopTimerAndSave, handleFileInput with these ---

async function fetchWorkspace() {
  setLoading(true);
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('fetchWorkspace error', error);
    setLoading(false);
    return null; // return null on error
  }
  setWorkspace(data);
  setLoading(false);
  return data; // return workspace so callers can await it
}

// Timer functions
function startTimer() {
  startTimeRef.current = Date.now();
  timerRef.current = setInterval(() => {
    // can update UI every minute if you want
  }, 60 * 1000);
}
async function stopTimerAndSave() {
  clearInterval(timerRef.current);
  const elapsed = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
  if (!elapsed || elapsed <= 0) return;

  // ensure workspace is loaded
  let ws = workspace;
  if (!ws) {
    ws = await fetchWorkspace();
    if (!ws) return; // can't proceed
  }

  // ownership check (prevent RLS violation)
  if (!user || ws.user_id !== user.id) {
    console.warn('Not inserting progress — current user is not workspace owner.');
    return;
  }

  // Prefer RPC (requires you to have this function created server-side as SECURITY DEFINER).
  try {
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_progress_time', {
        p_workspace_id: id,
        p_seconds: elapsed
      });
    if (rpcError) {
      // If rpc fails, fall back to direct insert (ownership already validated)
      console.warn('increment_progress_time rpc failed, falling back to client insert', rpcError);
      await supabase.from('progress').insert({
        workspace_id: id,
        time_spent_seconds: elapsed,
        last_active: new Date().toISOString()
      }).throwOnError();
    } else {
      // rpc succeeded — nothing else to do
    }
  } catch (err) {
    // Final fallback insert attempt (should not reach here normally)
    console.error('progress insert fallback error', err);
    try {
      await supabase.from('progress').insert({
        workspace_id: id,
        time_spent_seconds: elapsed,
        last_active: new Date().toISOString()
      });
    } catch (insertErr) {
      console.error('final insert failed', insertErr);
    }
  }
}

async function handleFileInput(e) {
  const file = e.target.files[0];
  if (!file) return;
setUploadProgress(10); // show start progress
  // Ensure workspace is loaded and owned
  let ws = workspace;
  if (!ws) {
    ws = await fetchWorkspace();
    if (!ws) {
      alert('Workspace could not be loaded. Try again.');
      return;
    }
  }
  if (!user || ws.user_id !== user.id) {
    alert('You cannot upload files to a workspace you do not own.');
    return;
  }

  // 1. upload raw file to Supabase storage
  const ext = file.name.split('.').pop();
  const path = `${id}/${Date.now()}.${ext}`;
    setUploadProgress(30);
  const { data: upData, error: upErr } = await supabase.storage.from('documents').upload(path, file);
  if (upErr) { alert(upErr.message); return; }

  const publicUrl = supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
  setUploadProgress(50);
  // 2. create document record (ownership already checked)
  const { data: doc, error: docErr } = await supabase.from('documents').insert({
    workspace_id: id,
    file_url: publicUrl,
    filename: file.name
  }).select().single();

  if (docErr) { console.error('documents insert error', docErr); alert(docErr.message); return; }
  setUploadProgress(70);
  // 3. extract text pages and chunk them, then call serverless /api/embeddings for each chunk

  const pages = await extractTextFromPDF(file); // returns [{pageNumber, text}]
  let totalChunks = 0;
let processedChunks = 0;
for (const p of pages) totalChunks += chunkText(p.text, 200).length;
  for (const p of pages) {
    const chunks = chunkText(p.text, 200);
    for (const chunk of chunks) {
      // call server endpoint to create embedding and store vector
      await fetch('https://smart-study-buddy-six.vercel.app/api/embeddings', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          workspace_id: id,
          document_id: doc.id,
          page_number: p.pageNumber,
          chunk_text: chunk
        })
      }).then(r => r.json()).catch(err => console.error('embedding error', err));
       processedChunks++;
    console.log(`Progress: ${Math.round((processedChunks / totalChunks) * 100)}%`);
    }
  }
  setUploadProgress(100);
  setTimeout(() => setUploadProgress(0), 2000);
  alert('File uploaded and processed (embeddings created).');
}


async function handleHandwrittenInput(e) {
  const file = e.target.files[0];
  if (!file) return;
  setUploadProgress(10);

  let ws = workspace;
  if (!ws) ws = await fetchWorkspace();
  if (!ws) return alert('Workspace could not be loaded.');
  if (!user || ws.user_id !== user.id) {
    alert('You cannot upload files to a workspace you do not own.');
    return;
  }

  // Upload file to Supabase Storage
  const ext = file.name.split('.').pop();
  const path = `${id}/handwritten_${Date.now()}.${ext}`;
  const { data: upData, error: upErr } = await supabase.storage.from('documents').upload(path, file);
  if (upErr) return alert(upErr.message);

  const publicUrl = supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
  setUploadProgress(30);

  // Create DB record
  const { data: doc, error: docErr } = await supabase.from('documents').insert({
    workspace_id: id,
    file_url: publicUrl,
    filename: file.name,
    type: 'handwritten'
  }).select().single();

  if (docErr) return alert(docErr.message);
  setUploadProgress(50);

  // Extract text using OCR
  const extractedText = await extractTextFromHandwritten(file);
  setUploadProgress(70);

  // Split and send to embeddings API
  const chunks = chunkText(extractedText, 200);
  let processed = 0;
  for (const chunk of chunks) {
    await fetch('https://smart-study-buddy-six.vercel.app/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: id,
        document_id: doc.id,
        page_number: 1,
        chunk_text: chunk,
      }),
    });
    processed++;
    setUploadProgress(Math.round(70 + (processed / chunks.length) * 30));
  }

  setUploadProgress(100);
  setTimeout(() => setUploadProgress(0), 2000);
  alert('Handwritten notes uploaded and processed successfully!');
}

  // Chat ask (calls /api/query)
  async function askQuestion() {
    if (!query.trim()) return;
    const uMsg = { role: 'user', text: query, ts: Date.now() };
    setMessages(prev => [...prev, uMsg]);
    setQuery('');
      // ✅ Save user message in DB
  await supabase.from('chat_history').insert({
    workspace_id: id,
    user_id: user.id,
    role: 'user',
    text: uMsg.text,
  });
  try {

    // call server
    const res = await fetch('https://smart-study-buddy-six.vercel.app/api/query', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ workspace_id: id, question: uMsg.text })
    });
    const json = await res.json();
    const assistantMsg = { role: 'assistant', text: json.answer, sources: json.sources, ts: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);
    await supabase.from('chat_history').insert({
      workspace_id: id,
      user_id: user.id,
      role: 'assistant',
      text: json.answer,
      sources: json.sources || null,
    });

  } catch (err) {
    console.error("Error asking question:", err);
  }
  }

  if (loading) return <div>Loading workspace...</div>;
  if (!workspace) return <div>Workspace not found.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-950 text-gray-200 py-10 px-6 flex justify-center items-start">
  <div className="w-full max-w-6xl">

      <div className="flex justify-between items-start gap-4 bg-[#0f1628]/70 p-5 rounded-2xl border border-gray-800 shadow-md mb-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">{workspace.title}</h2>
          <p className="text-sm text-gray-600">{workspace.description}</p>
        </div>
        <div className="text-xs text-gray-500">Workspace ID: {workspace.id}</div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 bg-[#0e1629]/80 backdrop-blur-lg rounded-2xl border border-gray-800 shadow-xl">
          {uploadProgress > 0 && (
  <div className="w-full bg-gray-200 rounded mb-3 h-3 overflow-hidden">
    <div
      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded transition-all duration-300"
      style={{ width: `${uploadProgress}%` }}
    />
  </div>
)}

          <div className="mb-6 flex flex-wrap gap-3 justify-center">
            <label className="btn" htmlFor="fileInput">Upload PDF</label>
            <label className="btn" htmlFor="handwrittenInput">Upload Handwritten Notes</label>
<input
  id="handwrittenInput"
  type="file"
  accept="application/pdf,image/*"
  onChange={handleHandwrittenInput}
  className="hidden"
/>

            <input id="fileInput" type="file" accept="application/pdf" onChange={handleFileInput} className="hidden" />
            
            <button
  className="btn"
  onClick={() => navigate(`/workspace/${id}/exam`)}
>
  Exam Mode
</button>
            <button className="btn-ghost" onClick={() => setActiveTab('notes')}>Notes Summarizer</button>
            <button className="btn-ghost" onClick={() => setActiveTab('concept')}>Concept Tracker</button>
          </div>
{selectedDoc && (
  <div className="mb-4 border rounded overflow-hidden relative">
    {/* Close button */}
    <button
      onClick={() => setSelectedDoc(null)}
      className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600 transition"
    >
      ✕ Close PDF
    </button>

    {/* PDF viewer */}
    <iframe
      src={selectedDoc.file_url}
      title="PDF Viewer"
      className="w-full h-[500px] border-none"
    />
  </div>
)}


          {/* Tabs */}
          {activeTab === 'chat' && (
            <div>
              <div className="chat-window mb-4 space-y-3" style={{ maxHeight: 420, overflow: 'auto' }}>
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                    <div
  className={`inline-block p-3 rounded-xl shadow-sm text-gray-900 ${
    m.role === 'user' ? 'bg-white border border-blue-200' : 'bg-white border border-gray-200'
  }`}
>
  <div
    className="text-gray-800"
    dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>') }}
  />
</div>

                    {m.sources && <div className="text-xs text-gray-500 mt-1">Sources: {m.sources.map(s => `Page ${s.page}`).join(', ')}</div>}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input className="flex-1 p-2 border rounded" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ask about your notes..." />
                <button onClick={askQuestion} className="btn">Ask</button>
                <button
  onClick={async () => {
    await supabase.from('chat_history').delete().eq('workspace_id', id);
    setMessages([]);
  }}
  className="btn-ghost text-red-400"
>
  🗑️ Clear Chat
</button>

              </div>
            </div>
          )}

          {activeTab === 'exam' && (
            <div>
              <h3 className="font-semibold mb-2">Exam Mode</h3>
              <p className="text-sm text-gray-600 mb-3">Generate timed quiz from this workspace (use the "Generate Quiz" button).</p>
              <button className="btn" onClick={async () => {
                const resp = await fetch('https://smart-study-buddy-six.vercel.app/api/query', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ workspace_id: id, question: '::generate_quiz::', mode: 'quiz' }) });
                const j = await resp.json();
                alert('Quiz generated in chat. Open Chat tab to view questions.');
                setActiveTab('chat');
                setMessages(prev => [...prev, { role:'assistant', text: j.answer, sources: j.sources }]);
              }}>Generate Quiz</button>
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <h3 className="font-semibold mb-2">Smart Notes Summarizer</h3>
              <p className="text-sm text-gray-600 mb-3">Summarize uploaded notes or OCR images.</p>
              <button className="btn" onClick={async () => {
                const resp = await fetch('https://smart-study-buddy-six.vercel.app/api/query', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ workspace_id: id, question: '::summarize_notes::', mode: 'summarize' }) });
                const j = await resp.json();
                setActiveTab('chat'); // show summary in chat
                setMessages(prev => [...prev, { role:'assistant', text: j.answer }]);
              }}>Summarize Notes</button>
            </div>
          )}

          {activeTab === 'concept' && (
            <div>
              <h3 className="font-semibold mb-2">Concept Evolution Tracker</h3>
              <p className="text-sm text-gray-600">Compare how your understanding changed as you added documents.</p>
              <button className="btn" onClick={async () => {
                const resp = await fetch('https://smart-study-buddy-six.vercel.app/api/query', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ workspace_id: id, question: '::concept_evolution::', mode: 'concept' }) });
                const j = await resp.json();
                setActiveTab('chat');
                setMessages(prev => [...prev, { role:'assistant', text: j.answer }]);
              }}>Generate Evolution Insight</button>
            </div>
          )}
        </div>

        <aside className="p-6 bg-[#10172b]/80 backdrop-blur-lg rounded-2xl border border-gray-800 shadow-lg">
          <h4 className="font-semibold">Workspace Summary</h4>
          <p className="text-sm text-gray-600 mb-3">Uploaded documents and progress will appear here.</p>

          <div className="mb-4">
            <h5 className="text-sm font-medium">Documents</h5>
            <DocumentList workspaceId={id} setSelectedDoc={setSelectedDoc} selectedDoc={selectedDoc} />
          </div>

          <div className="mb-4">
            <h5 className="text-sm font-medium">Reading & Progress</h5>
            <ProgressWidget workspaceId={id} />
          </div>

          <div>
            <h5 className="text-sm font-medium">Stress-Free Mode</h5>
            <MotivationMini workspaceId={id} />
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}

/* Helper components (lightweight inline) */

function DocumentList({ workspaceId, setSelectedDoc, selectedDoc }) {
  const [docs, setDocs] = useState([]);
  useEffect(() => { fetchDocs(); }, [workspaceId]);
  async function fetchDocs() {
    const { data } = await supabase.from('documents').select('*').eq('workspace_id', workspaceId).order('uploaded_at', { ascending: false });
    setDocs(data || []);
  }
  return (
  <div className="space-y-2">
    {docs.map(d => (
      <div
        key={d.id}
        onClick={() => setSelectedDoc(d)}
        className={`cursor-pointer text-sm p-2 rounded border ${
          selectedDoc?.id === d.id ? 'bg-blue-50 border-blue-400' : 'border-gray-200 hover:bg-gray-50'
        }`}
      >
        📄 {d.filename}
      </div>
    ))}
    {docs.length === 0 && <div className="text-xs text-gray-500">No documents yet.</div>}
  </div>
);

}

function ProgressWidget({ workspaceId }) {
  const [progress, setProgress] = useState({ time_spent_seconds: 0, completion_percent: 0 });
  useEffect(() => { fetchProgress(); }, [workspaceId]);
  async function fetchProgress() {
    const { data } = await supabase.from('progress').select('time_spent_seconds, completion_percent').eq('workspace_id', workspaceId).order('last_active', { ascending: false }).limit(1);
    if (data && data.length) setProgress(data[0]);
  }
  return (
    <div className="text-sm">
      <div>Time spent: {(progress.time_spent_seconds || 0) / 60 >> 0} min</div>
    </div>
  );
}

function MotivationMini({ workspaceId }) {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState(null);
  async function sendMotivation() {
    if (!input.trim()) return;
    const res = await fetch('https://smart-study-buddy-six.vercel.app/api/query', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ workspace_id: workspaceId, question: input, mode: 'motivate' })
    });
    const j = await res.json();
    setReply(j.answer);
    setInput('');
  }
  return (
    <div>
  {reply && (
    <div className="mb-2 p-2 bg-green-100 text-gray-900 rounded text-sm">
      {reply}
    </div>
  )}
  <div className="flex gap-2">
    <input
      value={input}
      onChange={e => setInput(e.target.value)}
      className="flex-1 p-2 border rounded"
      placeholder="How are you feeling?"
    />
    <button className="btn" onClick={sendMotivation}>Talk</button>
  </div>
</div>

  );
}

