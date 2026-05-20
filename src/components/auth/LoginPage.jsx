// ============================================================
// LOGIN PAGE — Single entry point for both Mentor & Operations
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import catalystLogo from '../../assets/catalyst-logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [isLogin, setIsLogin]       = useState(true);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName]             = useState('');
  const [role, setRole]             = useState('mentor');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Maps each role to its home dashboard route
    const roleHome = {
      mentor:     '/mentor/dashboard',
      operations: '/operations/dashboard',
      student:    '/student/dashboard',
    };

    if (isLogin) {
      const result = await login(email, password);
      if (result.success) {
        navigate(roleHome[result.role] || '/');
      } else {
        setError(result.error);
      }
    } else {
      const result = await register(name, email, password, role);
      if (result.success) {
        navigate(roleHome[result.role] || '/');
      } else {
        setError(result.error);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-violet-50 to-purple-50 relative overflow-hidden p-5">
      {/* Background gradient blobs */}
      <div
        className="absolute -top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-[10%] -right-[5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-[440px] flex flex-col items-center gap-6 relative z-10">
        {/* Branding */}
        <div className="text-center flex flex-col items-center gap-2">
          <img
            src={catalystLogo}
            alt="Catalyst"
            className="h-12 w-auto object-contain drop-shadow-[0_4px_12px_rgba(13,148,136,0.25)]"
          />
          <p className="text-sm text-gray-500">Learning Management Platform</p>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-[20px] px-9 py-8 shadow-login border border-white/80">
          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-[10px] p-1 mb-6 gap-1">
            <button
              className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                isLogin
                  ? 'bg-white text-gray-900 font-semibold shadow-sm'
                  : 'text-gray-500 font-medium'
              }`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                !isLogin
                  ? 'bg-white text-gray-900 font-semibold shadow-sm'
                  : 'text-gray-500 font-medium'
              }`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-[22px] font-bold text-gray-900">
            {isLogin ? 'Welcome back 👋' : 'Create your account'}
          </h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            {isLogin ? 'Sign in to access your dashboard' : 'Join the Catalyst platform today'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name (sign-up only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Full Name</label>
                <input
                  className="px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 text-sm text-gray-900 outline-none transition-colors focus:border-mentor-primary"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-gray-700">Email Address</label>
              <input
                className="px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 text-sm text-gray-900 outline-none transition-colors focus:border-mentor-primary"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-gray-700">Password</label>
              <div className="relative">
                <input
                  className="w-full px-3.5 py-2.5 pr-10 rounded-[10px] border-[1.5px] border-gray-200 text-sm text-gray-900 outline-none transition-colors focus:border-mentor-primary"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Role selector (sign-up only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">I am a</label>
                <div className="flex gap-2.5">
                  {['mentor', 'operations'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`flex-1 py-2.5 rounded-[10px] border-[1.5px] text-sm transition-all ${
                        role === r
                          ? 'border-mentor-primary bg-mentor-lighter text-mentor-primary font-semibold'
                          : 'border-gray-200 text-gray-700 font-medium'
                      }`}
                      onClick={() => setRole(r)}
                    >
                      {r === 'mentor' ? '🎓 Mentor' : '⚙️ Operations'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-800 px-3.5 py-2.5 rounded-[10px] text-[13px] border border-red-200">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="py-3 rounded-xl mt-1 bg-gradient-to-r from-mentor-primary to-cyan-600 text-white font-bold text-[15px] shadow-[0_4px_15px_rgba(13,148,136,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
