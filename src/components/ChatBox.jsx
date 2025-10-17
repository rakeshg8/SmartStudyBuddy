import React, { useState } from 'react';

export default function ChatBox({ workspaceId }) {
  const [q, setQ] = useState('');
  const [messages, setMessages] = useState([]);

  const ask = async () => {
    setMessages(prev => [...prev, { role:'user', text: q }]);
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ workspace_id: workspaceId, question: q })
    });
    const j = await res.json();
    setMessages(prev => [...prev, { role:'assistant', text: j.answer, sources: j.sources }]);
    setQ('');
  };

  return (
    <div>
      <div className="chat-window space-y-4">
        {messages.map((m,i) => (
          <div key={i} className={m.role==='user'?'text-right':'text-left'}>
            <div className="inline-block p-2 rounded bg-gray-100">{m.text}</div>
            {m.sources && <div className="text-xs text-gray-500">Sources: {m.sources.map(s=>s.page).join(', ')}</div>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex">
        <input value={q} onChange={e=>setQ(e.target.value)} className="flex-1 mr-2" />
        <button onClick={ask} className="btn">Ask</button>
      </div>
    </div>
  );
}
