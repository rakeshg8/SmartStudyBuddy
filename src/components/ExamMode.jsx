// src/pages/ExamMode.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ExamMode() {
  const { id } = useParams(); // workspace id
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (!id) return;
    generateQuiz();
  }, [id]);

  async function generateQuiz() {
    setLoading(true);
    try {
      const resp = await fetch(
        "https://smart-study-buddy-six.vercel.app/api/query",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: id,
            question: "::generate_quiz::",
            mode: "quiz",
          }),
        }
      );
      const j = await resp.json();
      // Basic parsing: split questions if multiline
      const qs = j.answer
        ? j.answer
            .split(/\n(?=\d+\.)/)
            .map((q) => q.trim())
            .filter(Boolean)
        : [];
      setQuestions(qs);
    } catch (err) {
      console.error("Quiz generation failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-950 text-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-[#10172b]/70 border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            🧠 Exam Mode
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-300 hover:text-white"
          >
            ← Back
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400">Generating quiz...</div>
        ) : questions.length === 0 ? (
          <div className="text-center text-gray-500">
            No questions generated yet.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div
                key={i}
                className="p-4 bg-gray-800/40 rounded-lg border border-gray-700"
              >
                <p className="text-gray-100">{q}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
