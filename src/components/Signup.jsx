import React, { useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const nav = useNavigate();

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    alert('Check your email for confirmation link.');
    nav('/login');
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl mb-4">Sign up</h2>
      <form onSubmit={handleEmailSignUp}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="block mb-2" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="block mb-4" />
        <button className="btn">Sign up</button>
      </form>
      <hr className="my-4" />
      <button onClick={handleGoogle} className="btn">Continue with Google</button>
    </div>
  );
}
