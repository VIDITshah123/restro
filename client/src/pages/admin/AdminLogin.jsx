import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Lock, Mail, LogIn, Loader2, X, CheckCircle2, ChevronRight, User, Sparkles } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const googleBtnRef = useRef(null);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  // Initialize Google Identity Services if Client ID is configured
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setIsLoading(true);
            setLoginError('');
            try {
              const res = await api.post('/auth/google', { credential: response.credential });
              if (res.data.success) {
                login(res.data.data.token, res.data.data.role, res.data.data.email);
                navigate('/admin/dashboard');
              }
            } catch (err) {
              setLoginError(err.response?.data?.message || 'Google authentication failed.');
            } finally {
              setIsLoading(false);
            }
          }
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'pill'
          });
        }
      } catch (e) {
        console.warn('Google Identity Services notice:', e);
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.role, res.data.data.email);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAdminLogin = async (targetEmail) => {
    const emailToUse = (targetEmail || customGoogleEmail || email || '').trim();
    if (!emailToUse) {
      // If no email specified, open Google Account Selector
      setShowGoogleModal(true);
      return;
    }

    setLoginError('');
    setIsLoading(true);
    setShowGoogleModal(false);
    try {
      const res = await api.post('/auth/google', { email: emailToUse });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.role, res.data.data.email);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || `Access denied. Email "${emailToUse}" is not registered as Admin.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] mb-4">
            <ChefHat size={30} className="text-black" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Yummy Bites
          </h1>
          <p className="text-gray-500 text-xs uppercase tracking-widest mt-1 font-medium">Admin & Manager Portal</p>
        </div>

        {/* Card */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] p-8 space-y-5">
          {/* GIS Native button container (if client ID is supplied) */}
          <div ref={googleBtnRef} className="w-full flex justify-center empty:hidden" />

          {/* Google Quick Sign-In Button */}
          <motion.button
            type="button"
            onClick={() => handleGoogleAdminLogin(email ? email : null)}
            disabled={isLoading}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            <GoogleIcon />
            <span>{isLoading ? 'Connecting to Google...' : 'Sign In with Google'}</span>
          </motion.button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0f0f0f] px-3 text-[10px] text-gray-500 uppercase tracking-widest absolute">
              or with password
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Admin Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-gray-500" strokeWidth={1.5} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="shahvidit15@gmail.com / admin@restro.com"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-gray-500" strokeWidth={1.5} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            {loginError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
                <span className="mt-0.5">⚠</span>
                <span>{loginError}</span>
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin text-black" />
              ) : (
                <>
                  <LogIn size={15} strokeWidth={2.5} /> Sign In
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* Google Account Selection Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-6 text-gray-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <GoogleIcon />
                  <span className="text-sm font-bold text-gray-100">Sign in with Google</span>
                </div>
                <button
                  onClick={() => setShowGoogleModal(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-5">
                Choose an account to continue to <span className="text-amber-400 font-semibold">Yummy Bites Admin</span>
              </p>

              {/* Verified Accounts */}
              <div className="space-y-2 mb-4">
                {/* Account 1: shahvidit15@gmail.com */}
                <button
                  type="button"
                  onClick={() => handleGoogleAdminLogin('shahvidit15@gmail.com')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      V
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-100 group-hover:text-amber-400 transition-colors">Vidit Shah</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">Admin</span>
                      </div>
                      <span className="text-xs text-gray-400">shahvidit15@gmail.com</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-amber-400 transition-colors" />
                </button>

                {/* Account 2: admin@restro.com */}
                <button
                  type="button"
                  onClick={() => handleGoogleAdminLogin('admin@restro.com')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-bold text-base shadow-sm">
                      A
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-100 group-hover:text-amber-400 transition-colors">Restaurant Admin</span>
                        <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.2 rounded font-semibold">Admin</span>
                      </div>
                      <span className="text-xs text-gray-400">admin@restro.com</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-amber-400 transition-colors" />
                </button>
              </div>

              {/* Use Another Account Accordion */}
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <User size={15} />
                  <span>Use another Google account</span>
                </button>
              ) : (
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-gray-500" />
                    <input
                      type="email"
                      value={customGoogleEmail}
                      onChange={e => setCustomGoogleEmail(e.target.value)}
                      placeholder="Enter Google email..."
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleGoogleAdminLogin(customGoogleEmail)}
                      disabled={!customGoogleEmail.trim() || isLoading}
                      className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLogin;

