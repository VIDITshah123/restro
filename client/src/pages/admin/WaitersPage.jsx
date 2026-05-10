import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, UserCircle2, Pencil, Trash2 } from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600";
const labelClass = "block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2";

const WaitersPage = () => {
  const [waiters, setWaiters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState(null);
  const [form, setForm] = useState({ name: '', userid: '', password: '', is_active: 1 });
  const [error, setError] = useState('');
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();

  const fetchWaiters = async () => {
    try {
      const res = await api.get('/waiters');
      setWaiters(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchWaiters(); }, []);

  const openModal = (waiter = null) => {
    setError('');
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
    e.preventDefault();
    setError('');
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
    const confirmed = await showConfirm('Delete this waiter account? This cannot be undone.', { title: 'Delete Waiter', danger: true, confirmLabel: 'Delete' });
    if (!confirmed) return;
    try {
      await api.delete(`/waiters/${id}`);
      fetchWaiters();
    } catch (err) { await showAlert('Error deleting waiter.', { title: 'Error', danger: true }); }
  };

  const toggleActive = async (waiter) => {
    try {
      await api.put(`/waiters/${waiter.id}`, { is_active: waiter.is_active ? 0 : 1 });
      fetchWaiters();
    } catch (err) { await showAlert('Error updating status.', { title: 'Error', danger: true }); }
  };

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Waiters
          </h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">{waiters.length} staff members</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all text-sm uppercase tracking-wider"
        >
          <Plus size={16} strokeWidth={2.5} /> Add Waiter
        </motion.button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden"
      >
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">Staff Member</th>
              <th className="px-6 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">User ID</th>
              <th className="px-6 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">Status</th>
              <th className="px-6 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {waiters.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-600">
                  <UserCircle2 size={40} className="mx-auto mb-3 text-gray-700" strokeWidth={1} />
                  <p className="text-sm">No waiters added yet.</p>
                </td>
              </tr>
            )}
            {waiters.map((waiter, idx) => (
              <motion.tr
                key={waiter.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-500 font-black text-sm">{waiter.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="font-bold text-gray-200">{waiter.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-gray-500">{waiter.userid}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(waiter)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${waiter.is_active ? 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'bg-white/10'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${waiter.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openModal(waiter)} className="p-2 text-gray-500 hover:text-amber-500 bg-white/5 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 rounded-lg transition-all">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(waiter.id)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] max-w-sm w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-serif font-black text-gray-100">{editingWaiter ? 'Edit Waiter' : 'Add Waiter'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-300 bg-white/5 rounded-full p-1.5 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Rahul Sharma" />
                </div>
                <div>
                  <label className={labelClass}>User ID (for login)</label>
                  <input required type="text" value={form.userid} onChange={e => setForm({ ...form, userid: e.target.value })} className={inputClass} placeholder="e.g. waiter01" />
                </div>
                <div>
                  <label className={labelClass}>
                    Password {editingWaiter && <span className="text-gray-600 font-normal normal-case">(leave blank to keep current)</span>}
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputClass} required={!editingWaiter} />
                </div>
                {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 rounded-xl font-medium text-sm transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black rounded-xl text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all">
                    Save
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
