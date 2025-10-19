// src/api/query.js
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const COHERE_API_KEY = process.env.COHERE_API_KEY;

// cosine helper
function dot(a, b) {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}
function norm(a) {
  return Math.sqrt(a.reduce((s, x) => s + x * x, 0));
}
function cosine(a, b) {
  return dot(a, b) / (norm(a) * norm(b) + 1e-10);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { workspace_id, question } = req.body;

  try {
    // 1️⃣ Create embedding for the question using Cohere
    const embResp = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embed-english-v3.0",
        texts: [question],
      }),
    });

    const embJson = await embResp.json();
    const qVec = embJson.embeddings?.[0];
    if (!qVec) throw new Error("Failed to generate question embedding");

    // 2️⃣ Fetch embeddings from Supabase
    const { data: rows, error: fetchErr } = await supabase
      .from("embeddings")
      .select("id, chunk_text, page_number, embedding")
      .eq("workspace_id", workspace_id);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!rows?.length) throw new Error("No embeddings found for workspace");

    // 3️⃣ Compute similarity
    const scored = rows.map((r) => ({ ...r, score: cosine(qVec, r.embedding) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 6);

    // 4️⃣ Create RAG context
    const contextText = top.map((t) => `Page ${t.page_number}: ${t.chunk_text}`).join("\n---\n");
    const prompt = `You are an intelligent study assistant. Use the following context (from user's uploaded notes) to answer the question. Provide citations (page numbers) where relevant.\n\nContext:\n${contextText}\n\nQuestion: ${question}\n\nAnswer clearly with sources [{page, excerpt}].`;

    // 5️⃣ Call LLM (still via OpenRouter or Mistral)
    const llmResp = await fetch("https://api.openrouter.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700,
      }),
    });

    const llmJson = await llmResp.json();
    const answer = llmJson.choices?.[0]?.message?.content ?? llmJson.choices?.[0]?.text;

    // 6️⃣ Save chat history
    await supabase.from("chats").insert({
      workspace_id,
      question,
      answer,
      sources: top.map((t) => ({
        page: t.page_number,
        excerpt: t.chunk_text.slice(0, 200),
      })),
    });

    res.json({
      answer,
      sources: top.map((t) => ({
        page: t.page_number,
        excerpt: t.chunk_text.slice(0, 200),
        score: t.score,
      })),
    });
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: err.message });
  }
}
