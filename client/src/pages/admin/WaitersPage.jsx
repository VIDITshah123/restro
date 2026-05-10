import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, UserCircle2, Pencil, Trash2, ShieldCheck, ShieldOff, Users, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600";
const labelClass = "block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2";

// Deterministic color per waiter name initial
const AVATAR_COLORS = [
  'from-amber-500 to-orange-500',
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500',
  'from-cyan-500 to-sky-500',
];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const WaitersPage = () => {
  const [waiters, setWaiters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState(null);
  const [form, setForm] = useState({ name: '', userid: '', password: '', is_active: 1 });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();

  const fetchWaiters = async () => {
    try {
      const res = await api.get('/waiters');
      setWaiters(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchWaiters(); }, []);

  const openModal = (waiter = null) => {
    setError(''); setShowPassword(false);
    if (waiter) {
      setEditingWaiter(waiter);
      setForm({ name: waiter.name, userid: waiter.userid, password: '', is_active: waiter.is_active });
    } else {
      setEditingWaiter(null);
      setForm({ name: '', userid: '', password: '', is_active: 1 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (editingWaiter) {
        await api.put(`/waiters/${editingWaiter.id}`, form);
      } else {
        await api.post('/waiters', form);
      }
      setIsModalOpen(false);
      fetchWaiters();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving waiter');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Delete this waiter account? This cannot be undone.', {
      title: 'Delete Waiter', danger: true, confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/waiters/${id}`); fetchWaiters();
    } catch (err) { await showAlert('Error deleting waiter.', { title: 'Error', danger: true }); }
  };

  const toggleActive = async (waiter) => {
    try {
      await api.put(`/waiters/${waiter.id}`, { is_active: waiter.is_active ? 0 : 1 });
      fetchWaiters();
    } catch (err) { await showAlert('Error updating status.', { title: 'Error', danger: true }); }
  };

  const activeCount = waiters.filter(w => w.is_active).length;
  const inactiveCount = waiters.length - activeCount;

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Waiters
          </h1>
          <p className="text-gray-600 text-sm mt-1 uppercase tracking-widest">Staff Management</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all text-sm uppercase tracking-wider"
        >
          <Plus size={16} strokeWidth={3} /> Add Waiter
        </motion.button>
      </motion.div>

      {/* ── Stats Strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {[
          { icon: Users, label: 'Total Staff', value: waiters.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { icon: UserCheck, label: 'Active', value: activeCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { icon: UserX, label: 'Inactive', value: inactiveCount, color: 'text-gray-500', bg: 'bg-white/5 border-white/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} border rounded-2xl px-5 py-4 flex items-center gap-4`}>
            <div className={`${color} opacity-80`}><Icon size={22} strokeWidth={1.5} /></div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Staff Cards Grid ── */}
      {waiters.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
          <UserCircle2 size={56} className="text-gray-800 mb-4" strokeWidth={1} />
          <p className="font-serif text-gray-600 text-lg italic">No waiters added yet</p>
          <p className="text-gray-700 text-sm mt-1">Click "Add Waiter" to get started</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {waiters.map((waiter, idx) => (
              <motion.div
                key={waiter.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
                className={`relative bg-[#0f0f0f] border rounded-2xl p-5 flex flex-col gap-4 transition-all ${
                  waiter.is_active
                    ? 'border-white/8 hover:border-amber-500/20 hover:shadow-[0_0_20px_rgba(251,191,36,0.05)]'
                    : 'border-white/5 opacity-60 hover:opacity-80'
                }`}
              >
                {/* Status dot */}
                <div className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${waiter.is_active ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-gray-700'}`} />

                {/* Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(waiter.name)} flex items-center justify-center shadow-lg shrink-0`}>
                    <span className="text-white font-black text-lg">{waiter.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-100 text-base truncate">{waiter.name}</p>
                    <p className="font-mono text-xs text-gray-600 truncate">@{waiter.userid}</p>
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider ${
                    waiter.is_active
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-gray-600'
                  }`}>
                    {waiter.is_active ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                    {waiter.is_active ? 'Active' : 'Inactive'}
                  </span>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleActive(waiter)}
                    title={waiter.is_active ? 'Deactivate' : 'Activate'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                      waiter.is_active ? 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'bg-white/10'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${waiter.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => openModal(waiter)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 text-gray-500 hover:text-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(waiter.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-gray-500 hover:text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${editingWaiter ? avatarColor(editingWaiter.name) : 'from-amber-500 to-amber-700'} flex items-center justify-center`}>
                    {editingWaiter
                      ? <span className="text-white font-black">{editingWaiter.name.charAt(0).toUpperCase()}</span>
                      : <Plus size={18} className="text-black" strokeWidth={3} />
                    }
                  </div>
                  <h2 className="text-lg font-serif font-black text-gray-100">
                    {editingWaiter ? `Edit — ${editingWaiter.name}` : 'Add New Waiter'}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-300 bg-white/5 rounded-full p-1.5 transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Rahul Sharma" />
                </div>
                <div>
                  <label className={labelClass}>User ID <span className="text-gray-600 font-normal normal-case">(used to login)</span></label>
                  <input required type="text" value={form.userid} onChange={e => setForm({ ...form, userid: e.target.value })} className={inputClass} placeholder="e.g. waiter01" />
                </div>
                <div>
                  <label className={labelClass}>
                    Password {editingWaiter && <span className="text-gray-600 font-normal normal-case">(leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className={`${inputClass} pr-11`}
                      required={!editingWaiter}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                    <span className="mt-0.5">⚠</span><span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t border-white/5">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-xl font-medium text-sm transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black rounded-xl text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all">
                    {editingWaiter ? 'Save Changes' : 'Add Waiter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppDialog dialogState={dialogState} closeDialog={closeDialog} />
    </div>
  );
};

export default WaitersPage;
