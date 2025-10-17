import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// helper
function dot(a,b){ return a.reduce((s,x,i)=>s+x*b[i],0); }
function norm(a){ return Math.sqrt(a.reduce((s,x)=>s+x*x,0)); }
function cosine(a,b){ return dot(a,b)/(norm(a)*norm(b) + 1e-10); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { workspace_id, question } = req.body;

  // 1) create embedding for question
  const embResp = await fetch('https://api.openrouter.ai/embeddings', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type':'application/json'},
    body: JSON.stringify({ model: "text-embedding-3-small", input: question })
  });
  const embJson = await embResp.json();
  const qVec = embJson.data?.[0].embedding;

  // 2) fetch embeddings from Supabase for workspace
  const { data: rows } = await supabase.from('embeddings')
    .select('id,chunk_text,page_number,embedding')
    .eq('workspace_id', workspace_id);

  // 3) compute similarity
  const scored = rows.map(r => ({ ...r, score: cosine(qVec, r.embedding) }));
  scored.sort((a,b) => b.score - a.score);
  const top = scored.slice(0, 6);

  // 4) build context
  let contextText = top.map(t => `Page ${t.page_number}: ${t.chunk_text}`).join('\n---\n');

  // 5) call LLM with RAG prompt
  const prompt = `You are an assistant. Use the following context (from user's uploaded notes) to answer the question. Provide citations (page numbers) where relevant.
Context:
${contextText}

Question: ${question}

Answer with short explanation and list sources as [{page, excerpt}] at the end.`;
  
  const llmResp = await fetch('https://api.openrouter.ai/v1/chat/completions', {
    method: 'POST',
    headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`},
    body: JSON.stringify({
      model: 'mistral-7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700
    })
  });
  const llmJson = await llmResp.json();
  const answer = llmJson.choices?.[0]?.message?.content ?? llmJson.choices?.[0]?.text;

  // 6) save chat to Supabase
  await supabase.from('chats').insert({
    workspace_id,
    question,
    answer,
    sources: top.map(t => ({ page: t.page_number, excerpt: t.chunk_text.slice(0,200) }))
  });

  res.json({ answer, sources: top.map(t => ({ page: t.page_number, excerpt: t.chunk_text.slice(0,200), score: t.score })) });
}
