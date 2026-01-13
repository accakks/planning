import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WorkPage from './components/WorkPage';
import Layout from './components/Layout';
import { UserProfile } from '@shared/types';
import { getUser, saveUser, logoutUser } from '@shared/services/storage';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkUser = async () => {
      const savedUser = await getUser();
      if (savedUser) {
        setUser(savedUser);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const handleLogin = (newUser: UserProfile) => {
    saveUser(newUser); // Persist session
    setUser(newUser);
  };

  const handleLogout = () => {
    logoutUser(); // Clear session from storage
    setUser(null); // Clear session from state
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <Layout onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
            <Route path="/work" element={<WorkPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;