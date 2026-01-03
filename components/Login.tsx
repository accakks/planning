import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Sparkles, ArrowRight, Mail, Lock, User, ArrowLeft, CheckCircle2, Loader2, KeyRound } from 'lucide-react';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

type AuthMode = 'code' | 'signup' | 'signin' | 'forgot';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('code');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');
  
  // Google Simulation State
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (mode === 'code') {
      if (accessCode.toLowerCase() === 'aaaa') {
        onLogin({
          email: `guest_${Date.now()}@kickoff.app`, // Unique ID for local storage
          name: name || 'Planner'
        });
      } else {
        setError('Invalid access code. Please try again.');
        setIsLoading(false);
      }
      return;
    }

    if (mode === 'forgot') {
      setResetSent(true);
      setIsLoading(false);
      return;
    }

    if (email && password) {
      const userProfile: UserProfile = {
        email,
        name: name || email.split('@')[0]
      };
      onLogin(userProfile);
    }
    setIsLoading(false);
  };

  const initGoogleLogin = async () => {
    setIsLoading(true);
    // Simulate network delay before popup opens
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsLoading(false);
    setShowGoogleModal(true);
  };

  const confirmGoogleLogin = async (selectedEmail: string, selectedName: string) => {
    setShowGoogleModal(false);
    setIsLoading(true);
    // Simulate authentication processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onLogin({
      email: selectedEmail,
      name: selectedName
    });
    setIsLoading(false);
  };

  const switchToEmail = () => {
    setMode('signin');
    setError('');
  };

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
            {mode === 'code' && "Enter 2026."}
            {mode === 'signup' && "Hello, Future."}
            {mode === 'signin' && "Welcome Back."}
            {mode === 'forgot' && "Reset Password"}
          </h1>
          <p className="text-slate-600">
            {mode === 'code' && "Your journey starts with a simple code."}
            {mode === 'signup' && "Let's plan your 2026 kick-off."}
            {mode === 'signin' && "Pick up where you left off."}
            {mode === 'forgot' && "Don't worry, it happens."}
          </p>
        </div>

        {/* Forgot Password Success State */}
        {mode === 'forgot' && resetSent ? (
          <div className="text-center space-y-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="flex-shrink-0" />
              <p className="text-sm font-medium">Reset link sent to {email}</p>
            </div>
            <button
              onClick={() => {
                setResetSent(false);
                setMode('signin');
              }}
              className="w-full py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          /* Main Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* CODE MODE INPUTS */}
            {mode === 'code' && (
              <>
                 <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50"
                    placeholder="Access Code (e.g. aaaa)"
                  />
                </div>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50"
                    placeholder="Your Name (Optional)"
                  />
                </div>
              </>
            )}

            {/* EMAIL/SIGNUP MODE INPUTS */}
            {mode === 'signup' && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                <input
                  type="text"
                  required={mode === 'signup'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50"
                  placeholder="What should we call you?"
                />
              </div>
            )}

            {(mode === 'signup' || mode === 'signin' || mode === 'forgot') && (
               <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50"
                  placeholder="name@example.com"
                />
              </div>
            )}

            {(mode === 'signup' || mode === 'signin') && (
              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50"
                    placeholder="Password"
                    minLength={6}
                  />
                </div>
                {mode === 'signin' && (
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-xl disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {mode === 'code' && "Enter Experience"}
                  {mode === 'signup' && "Start Planning"}
                  {mode === 'signin' && "Sign In"}
                  {mode === 'forgot' && "Send Reset Link"}
                  {mode !== 'forgot' && <ArrowRight size={20} />}
                </>
              )}
            </button>
            
            {/* Back Buttons */}
            {mode === 'forgot' && (
               <button 
                type="button"
                onClick={() => setMode('signin')}
                className="w-full py-2 text-slate-500 font-bold hover:text-slate-800 flex items-center justify-center gap-2"
               >
                 <ArrowLeft size={16} /> Back
               </button>
            )}

            {(mode === 'signup' || mode === 'signin') && (
               <button 
                type="button"
                onClick={() => {
                  setMode('code');
                  setError('');
                }}
                className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
               >
                 <KeyRound size={14} /> Use Access Code
               </button>
            )}

            {/* Alternative Auth Providers */}
            {mode !== 'forgot' && (
              <>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">
                    {mode === 'code' ? 'Or login with' : 'Or continue with'}
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {mode === 'code' ? (
                  <div className="grid grid-cols-1 gap-3">
                     <button
                        type="button"
                        onClick={switchToEmail}
                        className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Mail size={18} /> Email
                      </button>
                      <button
                        type="button"
                        onClick={initGoogleLogin}
                        className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                      >
                         <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                            </g>
                          </svg>
                         Google
                      </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={initGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                  >
                     {/* Google Logo */}
                     <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                      </g>
                    </svg>
                    Google
                  </button>
                )}
              </>
            )}
          </form>
        )}

        {/* Footer Toggle for Email Modes */}
        {mode !== 'forgot' && mode !== 'code' && (
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              {mode === 'signup' ? "Already have an account?" : "New here?"}
              <button 
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setEmail('');
                  setPassword('');
                  setName('');
                  setError('');
                }}
                className="ml-2 font-bold text-rose-600 hover:text-rose-700 hover:underline transition-colors"
              >
                {mode === 'signup' ? "Sign in" : "Create account"}
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Google Simulation Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-[400px] rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Google Header */}
              <div className="p-8 pb-4 text-center">
                 <div className="flex justify-center mb-4">
                    <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                      </g>
                    </svg>
                 </div>
                 <h3 className="text-xl font-medium text-slate-800">Sign in with Google</h3>
                 <p className="text-slate-600 mt-2 text-sm">Choose an account</p>
                 <p className="text-slate-600 text-sm">to continue to 2026 Planner</p>
              </div>

              {/* Account List */}
              <div className="border-t border-slate-100">
                 {email && (
                    <button 
                      onClick={() => confirmGoogleLogin(email, name || 'User')}
                      className="w-full flex items-center gap-4 px-8 py-4 hover:bg-slate-50 border-b border-slate-100 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                        {(name || email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                         <div className="font-medium text-slate-700 truncate">{name || 'User'}</div>
                         <div className="text-xs text-slate-500 truncate">{email}</div>
                      </div>
                    </button>
                 )}

                 <button 
                   onClick={() => confirmGoogleLogin('sarah.miller@gmail.com', 'Sarah Miller')}
                   className="w-full flex items-center gap-4 px-8 py-4 hover:bg-slate-50 border-b border-slate-100 text-left transition-colors"
                 >
                   <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-sm">S</div>
                   <div className="flex-1 overflow-hidden">
                      <div className="font-medium text-slate-700">Sarah Miller</div>
                      <div className="text-xs text-slate-500">sarah.miller@gmail.com</div>
                   </div>
                 </button>

                 <button 
                   onClick={() => confirmGoogleLogin('planner2026@gmail.com', 'Planner Enthusiast')}
                   className="w-full flex items-center gap-4 px-8 py-4 hover:bg-slate-50 border-b border-slate-100 text-left transition-colors"
                 >
                   <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">P</div>
                   <div className="flex-1 overflow-hidden">
                      <div className="font-medium text-slate-700">Planner Enthusiast</div>
                      <div className="text-xs text-slate-500">planner2026@gmail.com</div>
                   </div>
                 </button>

                 <button className="w-full flex items-center gap-4 px-8 py-4 hover:bg-slate-50 text-left transition-colors">
                    <div className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-500">
                       <User size={16} />
                    </div>
                    <div className="font-medium text-slate-700 text-sm">Use another account</div>
                 </button>
              </div>

              {/* Footer */}
              <div className="p-6 pt-4 text-center border-t border-slate-100">
                 <button 
                  onClick={() => setShowGoogleModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                 >
                   Cancel
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;