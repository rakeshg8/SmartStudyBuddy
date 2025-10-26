import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StressMode() {
  const [mood, setMood] = useState('funny');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://smart-study-buddy-six.vercel.app/api/stress-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      });
      const data = await res.json();
      setMessage(data.message);
    } catch (err) {
      setMessage('Oops! Could not fetch a stress relief message right now.');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-800 p-6">
      <h2 className="text-3xl font-bold text-indigo-400 mb-2">💬 Stress Mode</h2>
      <p className="text-gray-300 mb-6 text-center">Talk to AI for motivation or stress relief — stay positive!</p>

      <div className="flex gap-3 mb-4">
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="rounded-lg border p-2"
        >
          <option value="funny">Funny 😂</option>
          <option value="motivational">Motivational 🌈</option>
          <option value="silly">Silly Questions 🤪</option>
        </select>
        <button
          onClick={fetchMessage}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg"
        >
          {loading ? 'Thinking...' : 'Generate'}
        </button>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-md p-4 w-3/4 text-center text-lg text-gray-700 min-h-[100px]">
        {message || 'Ask AI to cheer you up! 💫'}
      </div>

      <button
        onClick={() => navigate('/')}
        className="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
