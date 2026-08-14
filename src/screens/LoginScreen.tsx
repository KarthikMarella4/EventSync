import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import WelcomeScreen from './WelcomeScreen';

const LoginScreen: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'initial' | 'credentials'>('initial');
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

  const handleContinueWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setStep('credentials');
    }
  };

  const handleStartAuth = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setShowWelcome(false);
    setStep('initial');
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
    <div className="font-display min-h-screen flex flex-col antialiased"
      style={{ background: 'linear-gradient(180deg, #e8f5e9 0%, #f1f8e9 8%, #fafdf6 20%, #ffffff 40%)' }}
    >
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center pt-20 md:pt-28 px-6">
        <div className="w-full max-w-[460px]">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <div className="w-[52px] h-[52px] rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/favicon.png" alt="EventSync" className="w-[52px] h-[52px] rounded-xl" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[28px] md:text-[32px] font-medium text-center text-[#1a1a1a] tracking-[-0.01em] mb-10 leading-[1.25]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {isLogin ? 'Log in or sign up for' : 'Sign up for'}
            <br />
            EventSync
          </h1>

          {step === 'initial' ? (
            <>
              {/* Continue with Google */}
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="w-full h-[50px] bg-white text-[#1a1a1a] rounded-[8px] text-[15px] font-medium hover:bg-gray-50 active:scale-[0.995] transition-all flex items-center justify-center gap-2.5"
                style={{ border: '1px solid #d1d5db' }}
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center gap-4 my-5">
                <div className="h-px flex-1" style={{ background: '#e5e7eb' }}></div>
                <span className="text-[#6b7280] text-[14px]">or</span>
                <div className="h-px flex-1" style={{ background: '#e5e7eb' }}></div>
              </div>

              {/* Email input */}
              <form onSubmit={handleContinueWithEmail}>
                <input
                  className="w-full h-[50px] px-4 bg-white rounded-[8px] outline-none text-[#1a1a1a] text-[15px] transition-all"
                  style={{
                    border: '1px solid #d1d5db',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#1a1a1a'; e.target.style.boxShadow = '0 0 0 1px #1a1a1a'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {error && <p className="text-red-600 text-sm text-center mt-3 mb-1">{error}</p>}

                {/* Continue with email button */}
                <button
                  type="submit"
                  className="w-full h-[50px] text-white rounded-[8px] font-semibold text-[15px] active:scale-[0.995] transition-all flex items-center justify-center mt-4"
                  style={{ background: '#14312A' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1a3d33')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#14312A')}
                >
                  Continue with email
                </button>
              </form>
            </>
          ) : (
            /* Step 2: Password (and name for sign up) */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Back to initial step */}
              <button
                type="button"
                onClick={() => { setStep('initial'); setError(''); }}
                className="self-start flex items-center gap-1 text-[14px] text-[#6b7280] hover:text-[#1a1a1a] font-medium transition-colors mb-1"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </button>

              {/* Show email (read-only) */}
              <div className="text-[14px] text-[#6b7280] mb-1">
                Continuing as <span className="text-[#1a1a1a] font-semibold">{email}</span>
              </div>

              {!isLogin && (
                <input
                  className="w-full h-[50px] px-4 bg-white rounded-[8px] outline-none text-[#1a1a1a] text-[15px] transition-all"
                  style={{ border: '1px solid #d1d5db' }}
                  onFocus={(e) => { e.target.style.borderColor = '#1a1a1a'; e.target.style.boxShadow = '0 0 0 1px #1a1a1a'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  placeholder="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              )}

              <div className="relative">
                <input
                  className="w-full h-[50px] px-4 pr-12 bg-white rounded-[8px] outline-none text-[#1a1a1a] text-[15px] transition-all"
                  style={{ border: '1px solid #d1d5db' }}
                  onFocus={(e) => { e.target.style.borderColor = '#1a1a1a'; e.target.style.boxShadow = '0 0 0 1px #1a1a1a'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#1a1a1a] transition-colors p-1 rounded"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>

              {error && <p className="text-red-600 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] text-white rounded-[8px] font-semibold text-[15px] active:scale-[0.995] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: '#14312A' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1a3d33')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#14312A')}
              >
                {loading ? (
                  <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
                )}
              </button>
            </form>
          )}

          {/* Toggle login / sign up */}
          <div className="mt-6 text-center">
            <p className="text-[#6b7280] text-[14px]">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); setStep('initial'); }}
                className="font-semibold hover:underline ml-1"
                style={{ color: '#14312A' }}
              >
                {isLogin ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 px-6 text-center">
        <p className="text-[#9ca3af] text-[14px]">
          By continuing, you agree to our{' '}
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline" style={{ color: '#2563eb' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline" style={{ color: '#2563eb' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
