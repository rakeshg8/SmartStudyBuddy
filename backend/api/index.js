import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
const app = express();
app.use(cors({
  origin: ["http://localhost:5173", "https://smart-study-buddy-six.vercel.app"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;
const OPENROUTER_API_KEY=process.env.OPENROUTER_API_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get("/", (req, res) => res.send("Smart Study Buddy API running ✅"));

app.post("/api/embeddings", async (req, res) => {
  const { workspace_id, document_id, page_number, chunk_text } = req.body;
  if (!chunk_text) return res.status(400).json({ error: "Missing chunk_text" });

  try {
    // ✅ 1. Get embeddings from Cohere (v2 API)
    const embResp = await fetch("https://api.cohere.ai/v2/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embed-english-v3.0", // ✅ correct model
        texts: [chunk_text],
        input_type: "search_document", // ✅ required for v3.0
      }),
    });

    console.log("Cohere response status:", embResp.status);
    const embJson = await embResp.json();
    console.log("Cohere response JSON:", embJson);

   const embedding = embJson.embeddings?.float?.[0];


    if (!embedding) {
      console.error("Cohere embedding error:", embJson);
      return res.status(500).json({ error: "Failed to generate embedding" });
    }

    // ✅ 2. Store in Supabase
    const { error } = await supabase.from("embeddings").insert({
      document_id,
      workspace_id,
      chunk_text,
      page_number,
      embedding,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Embedding handler failed:", err);
    res.status(500).json({ error: err.message });
  }
});
console.log("OPENROUTER_API_KEY:", !!process.env.OPENROUTER_API_KEY);

// ============ Query API ============
app.post("/api/query", async (req, res) => {
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
        input_type: "search_query",
      }),
    });

    const embJson = await embResp.json();
    const qVec = embJson.embeddings?.float?.[0] || embJson.embeddings?.[0];
    if (!qVec) throw new Error("Failed to generate question embedding");

    // 2️⃣ Fetch embeddings from Supabase
    const { data: rows, error: fetchErr } = await supabase
      .from("embeddings")
      .select("id, chunk_text, page_number, embedding")
      .eq("workspace_id", workspace_id);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!rows?.length) throw new Error("No embeddings found for workspace");

    // 3️⃣ Compute cosine similarity
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    const norm = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    const cosine = (a, b) => dot(a, b) / (norm(a) * norm(b) + 1e-10);

   // 3️⃣ Compute similarity
const scored = rows.map((r) => {
  // Parse the embedding (string or object) into an array
  let emb = r.embedding;
  if (typeof emb === "string") {
    try {
      emb = JSON.parse(emb);
    } catch {
      // Supabase can return as {float: [...]} if inserted that way
      emb = emb.replace(/[{}]/g, "").split(",").map(Number);
    }
  } else if (emb?.float) {
    emb = emb.float; // Cohere’s structure
  }

  return { ...r, score: cosine(qVec, emb) };
});

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 6);

    // 4️⃣ Build RAG prompt
    const contextText = top
      .map((t) => `Page ${t.page_number}: ${t.chunk_text}`)
      .join("\n---\n");

    const prompt = `You are an intelligent study assistant. Use the context below to answer the question accurately and cite relevant pages.\n\nContext:\n${contextText}\n\nQuestion: ${question}\n\nAnswer:`;

    // 5️⃣ Call LLM via OpenRouter
    const llmResp = await fetch("https://api.openrouter.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700,
      }),
    });

    const llmJson = await llmResp.json();
    console.log("OpenRouter LLM response:", llmJson);
    const answer =
      llmJson.choices?.[0]?.message?.content || llmJson.choices?.[0]?.text;

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
});


// ✅ Vercel export (no app.listen)
export default app;

