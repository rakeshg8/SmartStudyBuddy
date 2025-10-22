// src/context/AuthContext.jsx
import { supabase } from '../supabase/client';
import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
const navigate = useNavigate();
  useEffect(() => {
    // ✅ Correctly destructure subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    // ✅ Get current session once
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
      setLoading(false);
    })();

    // ✅ Properly clean up listener
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Proper sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/login"); // redirect to login after logout
  };


  return (
    <AuthContext.Provider value={{ user, loading, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
