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

  const { signInWithPassword, signUp } = useAuth();

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
