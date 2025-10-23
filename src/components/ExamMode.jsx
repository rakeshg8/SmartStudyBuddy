// src/pages/ExamMode.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ExamMode() {
  const { id } = useParams(); // workspace id
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [qaList, setQaList] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    generateQuiz();
  }, [id]);

  async function generateQuiz() {
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch("https://smart-study-buddy-six.vercel.app/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: id,
          question:
            "::generate_quiz::10_questions(5_easy,3_medium,2_hard)::based_on_workspace_topics::",
          mode: "quiz",
        }),
      });

      const j = await resp.json();
console.log("Quiz API response:", j);

      if (!j.answer) throw new Error("No quiz data returned from API.");

      // ✅ Parse questions and answers separately
      // ✅ Try multiple patterns to extract Q&A pairs
let qaText = j.answer || "";
const qaPattern = /(?:\*\*|#*\s*)?(?:Question|Q)[\s\d.:)*-]*([\s\S]*?)(?:\n|$).*?(?:Answer|A)[:\s-]*([\s\S]*?)(?=\n\s*(?:Q|Question|\*\*|$))/gi;

let matches = [];
let match;
while ((match = qaPattern.exec(qaText)) !== null) {
  matches.push({
    question: match[1].trim(),
    answer: match[2].trim(),
  });
}

if (matches.length === 0) {
  // fallback split by numbered list if simple pattern fails
  matches = qaText.split(/\d+\.\s*/).map(line => {
    const parts = line.split(/Answer[:\-]/i);
    return parts[0] && parts[1]
      ? { question: parts[0].trim(), answer: parts[1].trim() }
      : null;
  }).filter(Boolean);
}

setQaList(matches);

    } catch (err) {
      console.error("Quiz generation failed:", err);
      setError("Failed to generate quiz. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-950 text-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-[#10172b]/70 border border-gray-800 rounded-2xl p-6 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            🧠 Exam Mode
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-300 hover:text-white"
          >
            ← Back to Workspace
          </button>
        </div>

        {/* Status or Error */}
        {loading ? (
          <div className="text-center text-gray-400 animate-pulse">
            Generating your quiz... please wait
          </div>
        ) : error ? (
          <div className="text-center text-red-400">{error}</div>
        ) : qaList.length === 0 ? (
          <div className="text-center text-gray-500">
            No questions generated yet.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">
              Total Questions: {qaList.length} (5 Easy, 3 Moderate, 2 Tough)
            </p>
            <div className="space-y-6">
              {qaList.map((item, i) => (
                <div
                  key={i}
                  className="p-4 bg-gray-800/40 rounded-lg border border-gray-700 hover:border-indigo-400 transition-all"
                >
                  <p className="text-blue-400 font-semibold mb-2">
                    Question {i + 1}:
                  </p>
                  <p className="text-gray-100 mb-3">{item.question}</p>

                  <p className="text-green-400 font-semibold mb-2">
                    Answer {i + 1}:
                  </p>
                  <p className="text-gray-200">{item.answer}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
