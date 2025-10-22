// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import WorkspaceList from './components/WorkspaceList';
import WorkspaceView from './components/WorkspaceView';
import ExamMode from "./components/ExamMode";
import QuickStudyView from "./components/QuickStudyView";
function ProtectedRoute({ children }) {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <div className="p-8">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}
export default function App() {
  return (
     <BrowserRouter>
    <AuthProvider>
     
      
        <main className="p-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/exam-mode/:id" element={<ExamMode />} />
            <Route path="/workspace/:id/exam" element={<ExamMode />} />
            <Route path="/quick-study" element={<QuickStudyView />} />
            <Route path="/workspaces" element={
              <ProtectedRoute>
                <WorkspaceList />
              </ProtectedRoute>
            } />
            <Route path="/workspace/:id" element={
              <ProtectedRoute>
                <WorkspaceView />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        </AuthProvider>
      </BrowserRouter>
    
  );
}
