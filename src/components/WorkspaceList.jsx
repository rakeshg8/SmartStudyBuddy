// src/pages/WorkspaceList.jsx
import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function WorkspaceList() {
  const { user } = useContext(AuthContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchWorkspaces();
    // Re-fetch on DB changes (optional: real-time)
  }, [user]);

  async function fetchWorkspaces() {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error);
      return;
    }
    setWorkspaces(data || []);
  }

  async function createWorkspace(e) {
    e.preventDefault();
    if (!title.trim()) return alert('Enter title');
    const { data, error } = await supabase.from('workspaces').insert([{
      user_id: user.id,
      title: title.trim(),
      description: desc.trim()
    }]).select().single();

    if (error) return alert(error.message);
    setTitle('');
    setDesc('');
    // navigate to workspace view
    nav(`/workspace/${data.id}`);
  }

  return (
  <div className="max-w-5xl mx-auto px-4 py-8 text-left">
    <h2 className="text-3xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
      Your Workspaces
    </h2>

    <div className="flex flex-col gap-8">
      {/* Workspace creation form */}
      <form
        onSubmit={createWorkspace}
        className="bg-[#0e1629]/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 shadow-lg"
      >
        <input
          className="w-full mb-3 p-3 bg-[#1a1f35] border border-gray-700 text-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          placeholder="Workspace title (e.g. Physics - Electrodynamics)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full mb-3 p-3 bg-[#1a1f35] border border-gray-700 text-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          placeholder="Short description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="flex gap-3">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            type="submit"
          >
            Create Workspace
          </button>
          <button
            type="button"
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium px-4 py-2 rounded-lg transition-colors"
            onClick={fetchWorkspaces}
          >
            Refresh
          </button>
        </div>
      </form>

      {/* Workspaces grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {workspaces.map((w) => (
          <div
            key={w.id}
            className="bg-[#10172b]/70 backdrop-blur-sm p-5 rounded-2xl border border-gray-800 hover:border-indigo-500 hover:shadow-indigo-500/20 transition-all duration-300"
          >
            <h3 className="font-semibold text-lg text-gray-100 mb-1">
              {w.title}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {w.description || 'No description provided.'}
            </p>
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              onClick={() => nav(`/workspace/${w.id}`)}
            >
              Open
            </button>
          </div>
        ))}

        {workspaces.length === 0 && (
          <div className="p-6 text-gray-400 bg-[#10172b]/70 rounded-2xl border border-gray-800 text-center">
            No workspaces yet — create one above.
          </div>
        )}
      </div>
    </div>
  </div>
);

}
