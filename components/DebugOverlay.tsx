import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { testGeminiConnection } from '../services/gemini';
import { UserProfile } from '../types';
import { Activity, Database, AlertCircle, CheckCircle, RefreshCcw, X, Sparkles } from 'lucide-react';

interface DebugOverlayProps {
  user: UserProfile;
  lastError: string | null;
  onRefresh: () => void;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ user, lastError, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Database Status
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [dbMessage, setDbMessage] = useState('');

  // AI Status
  const [aiStatus, setAiStatus] = useState<'checking' | 'ok' | 'error' | 'idle'>('idle');
  const [aiMessage, setAiMessage] = useState('');

  const checkConnection = async () => {
    setDbStatus('checking');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1).single();
      if (error) throw error;
      setDbStatus('ok');
      setDbMessage('Connected to Supabase');
    } catch (e: any) {
      setDbStatus('error');
      setDbMessage(e.message || 'Connection Failed');
    }
  };

  const checkAiConnection = async () => {
    setAiStatus('checking');
    const { success, message, model } = await testGeminiConnection();
    if (success) {
      setAiStatus('ok');
      setAiMessage(`Connected (${model})`);
    } else {
      setAiStatus('error');
      setAiMessage(message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 p-2 bg-slate-900 text-slate-400 rounded-full opacity-50 hover:opacity-100 transition-opacity text-xs font-mono"
        title="Debug Panel"
      >
        DEBUG
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity size={18} className="text-rose-500" /> System Diagnostics
          </h3>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* User Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Authenticated User</h4>
            <div className="bg-slate-100 p-3 rounded-lg font-mono text-xs text-slate-600 break-all">
              <p><span className="font-bold">ID:</span> {user.id}</p>
              <p><span className="font-bold">Email:</span> {user.email}</p>
            </div>
          </div>

          {/* Database Check */}
          <div>
             <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Database Connection</h4>
             <div className={`p-3 rounded-lg flex items-center gap-3 border ${
               dbStatus === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 
               dbStatus === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
             }`}>
               {dbStatus === 'checking' && <RefreshCcw className="animate-spin" size={18} />}
               {dbStatus === 'ok' && <CheckCircle size={18} />}
               {dbStatus === 'error' && <AlertCircle size={18} />}
               <span className="text-sm font-medium">{dbStatus === 'checking' ? 'Testing Connection...' : dbMessage}</span>
             </div>
             {dbStatus === 'error' && (
               <p className="text-xs text-red-500 mt-2">
                 Tip: Check if RLS policies allow access or if tables exist.
               </p>
             )}
          </div>

          {/* Last Error */}
          {lastError && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Last Application Error</h4>
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-red-600 text-xs font-mono">
                {lastError}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
             <button 
               onClick={() => {
                 onRefresh();
                 setIsOpen(false);
               }}
               className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800"
             >
               <RefreshCcw size={16} /> Force Reload Data
             </button>
             <button 
               onClick={checkConnection}
               className="px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
             >
               Test DB
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DebugOverlay;

