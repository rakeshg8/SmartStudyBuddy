// src/pages/QuickStudyList.jsx
import React, { useEffect, useState, useContext } from "react";
import { supabase } from "../supabase/client";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function QuickStudyList() {
  const { user } = useContext(AuthContext);
  const [studies, setStudies] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchStudies();
  }, [user]);

  async function fetchStudies() {
    const { data, error } = await supabase
      .from("quick_studies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setStudies(data);
  }

  // 🟢 Function to create a new Quick Study with title prompt
  async function createNewStudy() {
    const title = prompt("Enter a title for your new Quick Study:");
    if (!title) return;

    const { data, error } = await supabase
      .from("quick_studies")
      .insert({
        user_id: user.id,
        title: title.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating study:", error);
      alert("Failed to create Quick Study.");
      return;
    }

    navigate(`/quickstudy/${data.id}`);
  }
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-4">📚 Your Quick Studies</h2>
      {/* 🟩 Create New Quick Study */}
      <button
        className="bg-indigo-500 hover:bg-indigo-600 text-white mb-4 px-4 py-2 rounded"
        onClick={createNewStudy}
      >
        ➕ New Quick Study
      </button>

      {studies.length === 0 && <p>No Quick Studies yet.</p>}

      <div className="space-y-3">
        {studies.map((s) => (
          <div
            key={s.id}
            className="bg-gray-800 rounded-xl p-4 flex justify-between items-center"
          >
            <div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-gray-400">
                {new Date(s.created_at).toLocaleString()}
              </p>
            </div>
            

          </div>
        ))}
      </div>
    </div>
  );
}
