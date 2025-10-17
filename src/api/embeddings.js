import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; // prefer service role for insert
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { workspace_id, document_id, page_number, chunk_text } = req.body;

  // 1) call embedding API (OpenRouter or OpenAI)
  const embResp = await fetch('https://api.openrouter.ai/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: chunk_text
    })
  });
  const embJson = await embResp.json();
  // adjust depending on response format
  const embedding = embJson.data?.[0].embedding ?? embJson.data?.[0]?.embedding ?? embJson.embedding;

  // 2) store embedding and chunk in Supabase
  const { error } = await supabase.from('embeddings').insert({
    document_id,
    workspace_id,
    chunk_text,
    page_number,
    embedding
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
