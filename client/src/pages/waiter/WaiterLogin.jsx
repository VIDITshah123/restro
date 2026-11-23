import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, UtensilsCrossed, Mail, KeyRound, ArrowRight } from 'lucide-react';
import api from '../../api';
import { useAuthStore } from '../../store';

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

const WaiterLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [googleEmail, setGoogleEmail] = useState('');
  const [showIdPassLogin, setShowIdPassLogin] = useState(false);
  const [form, setForm] = useState({ userid: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Task 8: Google Auth Login
  const handleGoogleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!googleEmail.trim()) {
      setError('Please enter your Google account email registered by Admin.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/waiter-google', { email: googleEmail.trim() });
      const { token, role, name, email, permissions, waiterId } = res.data.data;
      login(token, role, name || email, permissions, waiterId);
      navigate('/waiter');
    } catch (err) {
      setError(err.response?.data?.message || 'Access denied. Please check your registered Google email.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback ID/Pass login
  const handleIdPassSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/waiter-login', form);
      const { token, role, name, email, permissions, waiterId } = res.data.data;
      login(token, role, name, permissions, waiterId);
      navigate('/waiter');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-full max-w-sm relative"
      >
        {/* Card */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">

          {/* Header band */}
          <div className="bg-gradient-to-r from-amber-600/20 to-amber-500/5 border-b border-amber-500/10 px-8 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <UtensilsCrossed size={26} className="text-black" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
              Yummy Bites
            </h1>
            <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-medium">Waiter Station Portal</p>
          </div>

          <div className="px-8 py-7 space-y-5">
            {/* Task 8: Google Sign In Section */}
            {!showIdPassLogin ? (
              <form onSubmit={handleGoogleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">
                    Registered Google Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={googleEmail}
                      onChange={e => setGoogleEmail(e.target.value)}
                      placeholder="waiter@gmail.com"
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Your email must be registered by Admin in Waiters management.
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3"
                  >
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span>{error}</span>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin text-gray-900" /> Verifying Google Account...</>
                  ) : (
                    <>
                      <GoogleIcon />
                      <span>Sign In with Google</span>
                    </>
                  )}
                </motion.button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setShowIdPassLogin(true); setError(''); }}
                    className="text-xs text-gray-500 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    Use User ID & Password instead
                  </button>
                </div>
              </form>
            ) : (
              /* Fallback ID/Pass Form */
              <form onSubmit={handleIdPassSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">User ID</label>
                  <input
                    type="text"
                    value={form.userid}
                    onChange={e => setForm({ ...form, userid: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600"
                    placeholder="e.g. waiter01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3"
                  >
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span>{error}</span>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black py-3 rounded-xl uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Signing In...</> : 'Sign In with ID'}
                </motion.button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setShowIdPassLogin(false); setError(''); }}
                    className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    ← Back to Google Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-5 uppercase tracking-widest">
          Waiter Staff Access · Yummy Bites
        </p>
      </motion.div>
    </div>
  );
};

export default WaiterLogin;
