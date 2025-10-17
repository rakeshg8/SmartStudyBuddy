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
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Your Workspaces</h2>

      <form onSubmit={createWorkspace} className="mb-6 p-4 border rounded">
        <input className="w-full mb-2 p-2 border rounded" placeholder="Workspace title (e.g. Physics - Electrodynamics)"
          value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full mb-2 p-2 border rounded" placeholder="Short description (optional)"
          value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn" type="submit">Create Workspace</button>
          <button type="button" className="btn-ghost" onClick={fetchWorkspaces}>Refresh</button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspaces.map(w => (
          <div key={w.id} className="p-4 border rounded">
            <h3 className="font-semibold">{w.title}</h3>
            <p className="text-sm text-gray-600">{w.description}</p>
            <div className="mt-3 flex gap-2">
              <button className="btn" onClick={() => nav(`/workspace/${w.id}`)}>Open</button>
            </div>
          </div>
        ))}
        {workspaces.length === 0 && <div className="p-4 text-gray-500">No workspaces yet — create one above.</div>}
      </div>
    </div>
  );
}
