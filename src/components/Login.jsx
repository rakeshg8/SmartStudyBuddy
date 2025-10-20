import React, { useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    nav('/');
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0c10] via-[#1a1a1a] to-[#242424] p-6">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-md p-8 animate-fadeIn">
        <h2 className="text-3xl font-bold mb-6 text-center text-indigo-400">Welcome Back</h2>
        <p className="text-center text-gray-400 mb-6">Login to your account to continue</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 rounded-lg bg-[#242424] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg bg-[#242424] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-purple-500/40 transition-all"
          >
            Log In
          </button>
        </form>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-700" />
          <span className="mx-4 text-gray-500">or</span>
          <hr className="flex-grow border-gray-700" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all shadow-md"
        >
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C34.6 34.5 30.3 38 24 38 14.1 38 6 29.9 6 20S14.1 2 24 2c5.8 0 10.8 2.3 14.5 6l-5.9 5.9C30.3 9.9 27.3 8 24 8 16.3 8 10 14.3 10 22s6.3 14 14 14c7.4 0 12.9-5.2 13.6-12h-13.6v-8z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Don't have an account? <span className="text-indigo-400 cursor-pointer">Sign Up</span>
        </p>
      </div>
    </div>
  );
}
