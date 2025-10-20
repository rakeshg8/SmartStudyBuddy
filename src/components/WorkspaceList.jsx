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
    nav(`/workspace/${data.id}`);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-gradient-to-br from-gray-900 via-black to-gray-950 text-gray-200 py-12 px-6 sm:px-10">   
      <div className="w-full max-w-5xl">
        <h2 className="text-4xl font-bold text-center mb-10 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Your Workspaces ✨
        </h2>

        {/* Workspace creation form */}
        <form
          onSubmit={createWorkspace}
          className="bg-[#0e1629]/80 backdrop-blur-lg p-8 rounded-2xl border border-gray-800 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 mb-12"
        >
          <h3 className="text-xl font-semibold mb-6 text-center text-gray-100">
            Create a New Workspace 🧠
          </h3>
          <input
            className="w-full mb-4 p-3 bg-[#1a1f35] border border-gray-700 text-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            placeholder="Workspace title (e.g. Physics - Electrodynamics)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full mb-4 p-3 bg-[#1a1f35] border border-gray-700 text-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            placeholder="Short description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="flex justify-center gap-4">
            <button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-6 py-2.5 rounded-lg transition-all shadow-md hover:shadow-purple-500/30"
              type="submit"
            >
              Create Workspace
            </button>
            <button
              type="button"
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium px-6 py-2.5 rounded-lg transition-colors"
              onClick={fetchWorkspaces}
            >
              Refresh
            </button>
          </div>
        </form>

        {/* Workspaces grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {workspaces.map((w) => (
            <div
              key={w.id}
              className="relative bg-[#10172b]/80 backdrop-blur-lg p-6 rounded-2xl border border-gray-800 hover:border-indigo-500 hover:shadow-indigo-500/30 transition-all duration-300 group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <h3 className="font-semibold text-lg text-gray-100 mb-2 group-hover:text-indigo-400 transition-colors">
                  {w.title}
                </h3>
                <p className="text-sm text-gray-400 mb-5">
                  {w.description || 'No description provided.'}
                </p>
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                  onClick={() => nav(`/workspace/${w.id}`)}
                >
                  Open →
                </button>
              </div>
            </div>
          ))}

          {workspaces.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center bg-[#10172b]/70 backdrop-blur-sm p-10 rounded-2xl border border-gray-800 text-gray-400">
              No workspaces yet — create one above 🚀
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
