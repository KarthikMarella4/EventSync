import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import WelcomeScreen from './WelcomeScreen';

const LoginScreen: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signInWithPassword, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithPassword(email, password);
      } else {
        await signUp(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAuth = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setShowWelcome(false);
    setError('');
  };

  if (showWelcome) {
    return (
      <WelcomeScreen
        onGoToLogin={() => handleStartAuth(true)}
        onGoToSignUp={() => handleStartAuth(false)}
      />
    );
  }

  return (
    <div className="bg-background font-display text-text-main min-h-screen flex flex-col antialiased selection:bg-black selection:text-white">
      <div className="fixed top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-surface to-transparent -z-10 pointer-events-none"></div>

      {/* Back Button */}
      <button
        onClick={() => setShowWelcome(true)}
        className="absolute top-6 left-6 z-20 flex items-center justify-center size-10 rounded-full bg-white shadow-sm border border-gray-100 text-black hover:bg-gray-50 transition-colors"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 w-full max-w-md mx-auto relative z-10 py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto size-16 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-float transform transition-transform hover:scale-105 duration-300">
            <span className="material-symbols-outlined text-white text-[32px]">event_available</span>
          </div>
          <h1 className="text-3xl font-extrabold text-text-main tracking-tight mb-2">EventSync</h1>
          <p className="text-text-muted font-medium">{isLogin ? "Welcome back, please log in." : "Create your account to get started."}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {!isLogin && (
            <div className="group animate-in slide-in-from-top-2 fade-in duration-300">
              <label className="block text-sm font-bold text-text-main mb-2.5 ml-1">Full Name</label>
              <div className="relative transition-all duration-300">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-black transition-colors">
                  <span className="material-symbols-outlined text-[22px]">person</span>
                </span>
                <input
                  className="w-full h-[3.5rem] pl-12 pr-4 bg-surface border border-border-light rounded-2xl outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-text-main placeholder-text-muted/70 font-medium transition-all shadow-sm group-hover:border-black/20"
                  placeholder="Enter your name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="group">
            <label className="block text-sm font-bold text-text-main mb-2.5 ml-1">Email Address</label>
            <div className="relative transition-all duration-300">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-black transition-colors">
                <span className="material-symbols-outlined text-[22px]">mail</span>
              </span>
              <input
                className="w-full h-[3.5rem] pl-12 pr-4 bg-surface border border-border-light rounded-2xl outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-text-main placeholder-text-muted/70 font-medium transition-all shadow-sm group-hover:border-black/20"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-text-main mb-2.5 ml-1">Password</label>
            <div className="relative transition-all duration-300">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-black transition-colors">
                <span className="material-symbols-outlined text-[22px]">lock</span>
              </span>
              <input
                className="w-full h-[3.5rem] pl-12 pr-12 bg-surface border border-border-light rounded-2xl outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-text-main placeholder-text-muted/70 font-medium transition-all shadow-sm group-hover:border-black/20"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-black transition-colors p-1.5 rounded-full hover:bg-black/5 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-xl border border-red-100">{error}</p>}

          <div className="flex justify-end -mt-2">
            <a className="text-sm font-bold text-secondary hover:text-secondary/80 transition-colors" href="#">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[3.5rem] bg-black text-white rounded-2xl font-bold text-[17px] shadow-float hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
            )}
          </button>

          <div className="relative flex items-center gap-3 mt-2 mb-2">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Or continue with</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full h-[3.5rem] bg-white text-black border border-gray-200 rounded-2xl font-bold text-[16px] hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/google"
          >
            {/* Simple Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </form>


      </div>

      <div className="p-8 text-center bg-background border-t border-gray-50">
        <p className="text-text-muted text-sm font-medium">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-black font-bold hover:underline ml-1"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
