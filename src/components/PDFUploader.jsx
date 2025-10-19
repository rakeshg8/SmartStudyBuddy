import React from 'react';
import { supabase } from '../supabase/client';
import { extractTextFromPDF } from '../utils/pdfUtils';
import { chunkText } from '../utils/chunker';

export default function PDFUploader({ workspaceId }) {
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // 1) upload file to Supabase Storage
    const ext = file.name.split('.').pop();
    const filePath = `${workspaceId}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('documents').upload(filePath, file);
    if (error) return alert(error.message);
    const publicUrl = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;

    // 2) create document record
    const { data: doc, error: docErr } = await supabase.from('documents').insert({
      workspace_id: workspaceId,
      file_url: publicUrl,
      filename: file.name
    }).select().single();
    if (docErr) return alert(docErr.message);

    // 3) extract text & chunk by page
    const pages = await extractTextFromPDF(file);
    // for each page create chunks and request embeddings via server API
    for (const p of pages) {
      const chunks = chunkText(p.text, 200); // smaller chunk for LLM context
      for (const c of chunks) {
        // call your serverless /api/embeddings to get embedding & store it
        await fetch('https://smart-study-buddy-six.vercel.app/api/embeddings', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            workspace_id: workspaceId,
            document_id: doc.id,
            page_number: p.pageNumber,
            chunk_text: c
          })
        });
      }
    }
    alert('Uploaded and processed');
  };

  return <input type="file" accept="application/pdf" onChange={handleFile} />;
}
