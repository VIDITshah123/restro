import React, { useState, useEffect } from 'react';
import api from '../../api';

const WaitersPage = () => {
  const [waiters, setWaiters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState(null);
  const [form, setForm] = useState({ name: '', userid: '', password: '', is_active: 1 });
  const [error, setError] = useState('');

  const fetchWaiters = async () => {
    try {
      const res = await api.get('/waiters');
      setWaiters(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWaiters();
  }, []);

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
    if (!confirm('Delete this waiter account?')) return;
    try {
      await api.delete(`/waiters/${id}`);
      fetchWaiters();
    } catch (err) {
      alert('Error deleting waiter');
    }
  };

  const toggleActive = async (waiter) => {
    try {
      await api.put(`/waiters/${waiter.id}`, { is_active: waiter.is_active ? 0 : 1 });
      fetchWaiters();
    } catch (err) {
      alert('Error updating status');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Waiter Management</h1>
        <button onClick={() => openModal()} className="bg-black text-white px-4 py-2 rounded-lg font-medium">
          + Add Waiter
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">User ID</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {waiters.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-400">No waiters added yet.</td>
              </tr>
            )}
            {waiters.map(waiter => (
              <tr key={waiter.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">{waiter.name}</td>
                <td className="p-4 font-mono text-sm text-gray-600">{waiter.userid}</td>
                <td className="p-4">
                  <button
                    onClick={() => toggleActive(waiter)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${waiter.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${waiter.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => openModal(waiter)} className="text-blue-600 text-sm font-medium">Edit</button>
                  <button onClick={() => handleDelete(waiter.id)} className="text-red-600 text-sm font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingWaiter ? 'Edit Waiter' : 'Add New Waiter'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">User ID (for login)</label>
                <input required type="text" value={form.userid} onChange={e => setForm({ ...form, userid: e.target.value })} className="w-full border rounded-lg p-2" placeholder="e.g. waiter01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password {editingWaiter && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  required={!editingWaiter}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitersPage;
