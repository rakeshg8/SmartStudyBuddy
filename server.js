import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.post("/api/embeddings", async (req, res) => {
  const { workspace_id, document_id, page_number, chunk_text } = req.body;
  if (!chunk_text) return res.status(400).json({ error: "Missing chunk_text" });

  try {
    const embResp = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embed-english-v3.0",
        texts: [chunk_text],
      }),
    });

    const embJson = await embResp.json();
    const embedding = embJson.embeddings?.[0];

    if (!embedding) {
      console.error("Cohere embedding error:", embJson);
      return res.status(500).json({ error: "Failed to generate embedding" });
    }

    const { error } = await supabase.from("embeddings").insert({
      document_id,
      workspace_id,
      chunk_text,
      page_number,
      embedding,
    });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("✅ API running on http://localhost:5000"));
