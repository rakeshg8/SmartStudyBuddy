import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
const app = express();
app.use(cors()); // ✅ Allow all origins (for development)

app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

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
        model: "embed-english-v3.0", // latest model
        texts: [chunk_text], // ✅ Must be an array of strings
      }),
    });

    console.log("Cohere response status:", embResp.status);
    const embJson = await embResp.json();
    console.log("Cohere response JSON:", embJson);

    const embedding = embJson.embeddings?.[0]?.embedding;

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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));






