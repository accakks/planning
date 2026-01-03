import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';
import { Sparkles, ArrowRight, Loader2, KeyRound } from 'lucide-react';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

// type AuthMode = 'signup' | 'signin' | 'forgot';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // const [mode, setMode] = useState<AuthMode>('signin');
  // const [email, setEmail] = useState('');
  // const [name, setName] = useState('');
  // const [password, setPassword] = useState('');
  // const [resetSent, setResetSent] = useState(false);
  
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccessCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (accessCode.length !== 4) {
      setError('Access code must be 4 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Convention: code@planning.app / access-code-code
      const email = `${accessCode.toLowerCase()}@planning.app`;
      const password = `access-code-${accessCode.toLowerCase()}`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('Invalid access code');
        }
        throw error;
      }

      if (data.user) {
        onLogin({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata.name || 'Planner',
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /* 
  const handleSubmit = async (e: React.FormEvent) => {
    // ... old implementation ...
  };

  const handleGoogleLogin = async () => {
    // ... old implementation ...
  };
  */

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center relative overflow-hidden px-4">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="z-10 bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 max-w-md w-full animate-in fade-in zoom-in duration-300">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 text-white mb-4 shadow-lg">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 font-display">
            Enter Access Code
          </h1>
          <p className="text-slate-600">
            Please enter your unique 4-letter code to continue.
          </p>
        </div>

        {/* Access Code Form */}
        <form onSubmit={handleAccessCodeLogin} className="space-y-4">
          
          <div className="relative group">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
            <input
              type="text"
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50 uppercase tracking-widest font-mono text-lg"
              placeholder="CODE"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || accessCode.length !== 4}
            className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-xl disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Continue <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;