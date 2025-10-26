// src/pages/QuickStudyList.jsx
import React, { useEffect, useState, useContext } from "react";
import { supabase } from "../supabase/client";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function QuickStudyList() {
  const { user } = useContext(AuthContext);
  const [studies, setStudies] = useState([]);
  const navigate = useNavigate();
const [showModal, setShowModal] = useState(false);
const [newTitle, setNewTitle] = useState('');

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
  function openCreateModal() {
  setNewTitle('');
  setShowModal(true);
}
async function saveNewStudy() {
  if (!newTitle.trim()) return;

  const { data, error } = await supabase
    .from("quick_studies")
    .insert({ user_id: user.id, title: newTitle.trim() })
    .select()
    .single();

  if (error) {
    console.error("Error creating study:", error);
    alert("Failed to create Quick Study.");
    return;
  }

  setShowModal(false);
  navigate(`/quickstudy/${data.id}`);
}


  // 🟥 Function to delete a Quick Study
async function deleteStudy(id) {
  const confirmDelete = window.confirm("Are you sure you want to delete this Quick Study?");
  if (!confirmDelete) return;

  const { error } = await supabase
    .from("quick_studies")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting study:", error);
    alert("Failed to delete Quick Study.");
    return;
  }

  // Remove deleted study from state
  setStudies(studies.filter((s) => s.id !== id));
}

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-4">📚 Your Quick Studies</h2>
      {/* 🟩 Create New Quick Study */}
      <button
        className="bg-indigo-500 hover:bg-indigo-600 text-white mb-4 px-4 py-2 rounded"
        onClick={openCreateModal}
      >
        ➕ New Quick Study
      </button>
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-gray-800 rounded-xl p-6 w-96 shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-white">Create New Quick Study</h3>
      <input
        type="text"
        placeholder="Enter study title..."
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
         onKeyDown={(e) => { if (e.key === 'Enter') saveNewStudy(); }} // ✅ Press Enter to submit
  autoFocus // ✅ Automatically focus input when modal opens
  className="w-full p-3 rounded border border-gray-600 bg-gray-900 text-gray-100 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex justify-end gap-2">
        <button
          className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white"
          onClick={() => setShowModal(false)}
        >
          Cancel
        </button>
        <button
          className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-white"
          onClick={saveNewStudy}
        >
          Create
        </button>
      </div>
    </div>
  </div>
)}

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
            
          <div className="flex gap-2">
  <button
    onClick={() => navigate(`/quickstudy/${s.id}`)}
    className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-white"
  >
    Open
  </button>
  <button
    onClick={() => deleteStudy(s.id)}
    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white"
  >
    Delete
  </button>
</div>
  

          </div>
        ))}
      </div>
    </div>
  );
}
