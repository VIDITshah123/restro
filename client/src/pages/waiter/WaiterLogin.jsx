import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, UtensilsCrossed } from 'lucide-react';
import api from '../../api';
import { useAuthStore } from '../../store';

const WaiterLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ userid: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/waiter-login', form);
      const { token, role, name } = res.data.data;
      login(token, role, name);
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
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">

          {/* Header band */}
          <div className="bg-gradient-to-r from-amber-600/20 to-amber-500/5 border-b border-amber-500/10 px-8 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <UtensilsCrossed size={26} className="text-black" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
              Cafe Fillo
            </h1>
            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Waiter Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">User ID</label>
              <input
                type="text"
                value={form.userid}
                onChange={e => setForm({ ...form, userid: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-700"
                placeholder="e.g. waiter01"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-700"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3"
              >
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black py-3 rounded-xl uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing In...</> : 'Sign In'}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-gray-800 text-xs mt-5 uppercase tracking-widest">
          Staff access only
        </p>
      </motion.div>
    </div>
  );
};

export default WaiterLogin;
