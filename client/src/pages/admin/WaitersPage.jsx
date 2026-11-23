import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, UserCircle2, Pencil, Trash2, ShieldCheck, ShieldOff,
  Users, Eye, EyeOff, Mail, CheckSquare, Square, ShoppingBag, Utensils, Ban, Bike
} from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600";
const labelClass = "block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2";

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
  const [form, setForm] = useState({
    name: '',
    email: '',
    userid: '',
    password: '',
    is_active: 1,
    can_place_order: 1,
    can_cancel_order: 0,
    can_place_online_order: 0,
    can_place_takeaway_delivery: 0
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();

  const fetchWaiters = async () => {
    try {
      const res = await api.get('/waiters');
      setWaiters(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchWaiters(); }, []);

  const openModal = (waiter = null) => {
    setError(''); setShowPassword(false);
    if (waiter) {
      setEditingWaiter(waiter);
      setForm({
        name: waiter.name,
        email: waiter.email || '',
        userid: waiter.userid,
        password: '',
        is_active: waiter.is_active,
        can_place_order: waiter.can_place_order !== undefined ? waiter.can_place_order : 1,
        can_cancel_order: waiter.can_cancel_order || 0,
        can_place_online_order: waiter.can_place_online_order || 0,
        can_place_takeaway_delivery: waiter.can_place_takeaway_delivery || 0
      });
    } else {
      setEditingWaiter(null);
      setForm({
        name: '',
        email: '',
        userid: '',
        password: '',
        is_active: 1,
        can_place_order: 1,
        can_cancel_order: 0,
        can_place_online_order: 0,
        can_place_takeaway_delivery: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setError('');
    if (!form.email || !form.email.trim()) {
      setError('Google Account Email is required so the waiter can log in.');
      return;
    }
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
      await api.delete(`/waiters/${id}`);
      fetchWaiters();
    } catch (err) {
      await showAlert('Error deleting waiter.', { title: 'Error', danger: true });
    }
  };

  const toggleActive = async (waiter) => {
    try {
      await api.put(`/waiters/${waiter.id}`, { is_active: waiter.is_active ? 0 : 1 });
      fetchWaiters();
    } catch (err) {
      await showAlert('Error updating status.', { title: 'Error', danger: true });
    }
  };

  const activeCount = waiters.filter(w => w.is_active).length;
  const inactiveCount = waiters.length - activeCount;

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Waiters & Access Control
          </h1>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">
            Manage Google Auth Credentials & Feature Access Permissions
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all text-sm uppercase tracking-wider cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} /> Add Waiter
        </motion.button>
      </motion.div>

      {/* Stats bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-400 font-mono">{waiters.length}</p>
          <p className="text-xs text-gray-600 uppercase tracking-widest mt-1">Total Waiters</p>
        </div>
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400 font-mono">{activeCount}</p>
          <p className="text-xs text-gray-600 uppercase tracking-widest mt-1">Active Accounts</p>
        </div>
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-gray-500 font-mono">{inactiveCount}</p>
          <p className="text-xs text-gray-600 uppercase tracking-widest mt-1">Inactive</p>
        </div>
      </motion.div>

      {/* Waiters Grid */}
      {waiters.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center border border-dashed border-white/10 rounded-3xl">
          <UserCircle2 size={48} className="text-gray-700 mx-auto mb-3" />
          <p className="font-serif text-gray-500 text-lg italic">No waiters registered yet</p>
          <p className="text-gray-600 text-sm mt-1">Click "Add Waiter" to assign a waiter and configure their permissions</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {waiters.map((waiter, idx) => (
              <motion.div
                key={waiter.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
                className={`relative bg-[#0f0f0f] border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all ${
                  waiter.is_active
                    ? 'border-white/10 hover:border-amber-500/30 hover:shadow-[0_0_25px_rgba(251,191,36,0.06)]'
                    : 'border-white/5 opacity-60'
                }`}
              >
                {/* Header: Avatar, Name & Google Email */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(waiter.name)} flex items-center justify-center shadow-lg shrink-0`}>
                        <span className="text-white font-black text-lg">{waiter.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-100 text-base truncate">{waiter.name}</p>
                        <p className="font-mono text-xs text-amber-500/80 truncate flex items-center gap-1 mt-0.5">
                          <Mail size={12} className="shrink-0" />
                          {waiter.email || 'No Google Email'}
                        </p>
                        <p className="font-mono text-[10px] text-gray-600 truncate">ID: @{waiter.userid}</p>
                      </div>
                    </div>

                    {/* Toggle Active Switch */}
                    <button
                      onClick={() => toggleActive(waiter)}
                      title={waiter.is_active ? 'Deactivate' : 'Activate'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all shrink-0 ${
                        waiter.is_active ? 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'bg-white/10'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${waiter.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Task 9: Permissions Badges */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                      Granted Access Features
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <span className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                        waiter.can_place_order
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
                          : 'bg-white/5 text-gray-600 border-white/5 line-through'
                      }`}>
                        <Utensils size={11} /> Place Order
                      </span>
                      <span className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                        waiter.can_cancel_order
                          ? 'bg-red-500/10 text-red-400 border-red-500/20 font-bold'
                          : 'bg-white/5 text-gray-600 border-white/5 line-through'
                      }`}>
                        <Ban size={11} /> Cancel Order
                      </span>
                      <span className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                        waiter.can_place_online_order
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold'
                          : 'bg-white/5 text-gray-600 border-white/5 line-through'
                      }`}>
                        <ShoppingBag size={11} /> Online Order
                      </span>
                      <span className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                        waiter.can_place_takeaway_delivery
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold'
                          : 'bg-white/5 text-gray-600 border-white/5 line-through'
                      }`}>
                        <Bike size={11} /> Takeaway / Del.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => openModal(waiter)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 text-gray-400 hover:text-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(waiter.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-gray-400 hover:text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Waiter Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="bg-[#0f0f0f] border border-amber-500/20 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] max-w-md w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#141414]">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${editingWaiter ? avatarColor(editingWaiter.name) : 'from-amber-500 to-amber-700'} flex items-center justify-center shadow-md`}>
                    {editingWaiter
                      ? <span className="text-white font-black">{editingWaiter.name.charAt(0).toUpperCase()}</span>
                      : <Plus size={18} className="text-black" strokeWidth={3} />
                    }
                  </div>
                  <div>
                    <h2 className="text-base font-serif font-black text-gray-100">
                      {editingWaiter ? `Edit Waiter — ${editingWaiter.name}` : 'Register New Waiter'}
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Google OAuth Authentication & Permissions
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-300 bg-white/5 rounded-full p-1.5 transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                {/* Task 8: Google Email ID */}
                <div>
                  <label className={labelClass}>
                    Google Account Email * <span className="text-amber-500/80 font-normal normal-case">(Used to log in via Google)</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm({
                        ...form,
                        email: e.target.value,
                        userid: form.userid || e.target.value.split('@')[0]
                      })}
                      className={`${inputClass} pl-10`}
                      placeholder="e.g. waiter.rahul@gmail.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>User ID</label>
                    <input
                      type="text"
                      value={form.userid}
                      onChange={e => setForm({ ...form, userid: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. rahul01"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password <span className="text-gray-600 font-normal normal-case">(Optional)</span></label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className={inputClass}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Task 9: Permissions Checklist */}
                <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                      Feature Permissions
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase">Granted by Admin</span>
                  </div>

                  <div className="space-y-2.5">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(form.can_place_order)}
                        onChange={e => setForm({ ...form, can_place_order: e.target.checked ? 1 : 0 })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        form.can_place_order ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/20 bg-white/5'
                      }`}>
                        {form.can_place_order && <CheckSquare size={14} strokeWidth={3} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-200 block group-hover:text-amber-400 transition-colors">
                          Place Order
                        </span>
                        <span className="text-[10px] text-gray-500 block">Allow waiter to take and submit new orders</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(form.can_cancel_order)}
                        onChange={e => setForm({ ...form, can_cancel_order: e.target.checked ? 1 : 0 })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        form.can_cancel_order ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/20 bg-white/5'
                      }`}>
                        {form.can_cancel_order && <CheckSquare size={14} strokeWidth={3} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-200 block group-hover:text-amber-400 transition-colors">
                          Cancel Order
                        </span>
                        <span className="text-[10px] text-gray-500 block">Allow waiter to cancel items / active orders</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(form.can_place_online_order)}
                        onChange={e => setForm({ ...form, can_place_online_order: e.target.checked ? 1 : 0 })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        form.can_place_online_order ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/20 bg-white/5'
                      }`}>
                        {form.can_place_online_order && <CheckSquare size={14} strokeWidth={3} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-200 block group-hover:text-amber-400 transition-colors">
                          Place Online Order
                        </span>
                        <span className="text-[10px] text-gray-500 block">Allow Zomato, Swiggy, and other online channel orders</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(form.can_place_takeaway_delivery)}
                        onChange={e => setForm({ ...form, can_place_takeaway_delivery: e.target.checked ? 1 : 0 })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        form.can_place_takeaway_delivery ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/20 bg-white/5'
                      }`}>
                        {form.can_place_takeaway_delivery && <CheckSquare size={14} strokeWidth={3} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-200 block group-hover:text-amber-400 transition-colors">
                          Place Takeaway & Free Delivery
                        </span>
                        <span className="text-[10px] text-gray-500 block">Allow takeaway and direct home delivery orders</span>
                      </div>
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
                    <span className="mt-0.5">⚠</span><span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t border-white/5">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer">
                    {editingWaiter ? 'Save Changes' : 'Register Waiter'}
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
