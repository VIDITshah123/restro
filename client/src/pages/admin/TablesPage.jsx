import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Trash2, ShoppingBag, Plus, Grid3x3, Users, Layers,
  GitMerge, X, AlertCircle, Check, Utensils
} from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';
import PlaceOrderModal from '../../components/admin/PlaceOrderModal';
import { io } from 'socket.io-client';

const STATUS_CONFIG = {
  free:     { label: 'Free',         color: 'green',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  dot: 'bg-green-500'  },
  occupied: { label: 'Guests Seated',color: 'amber',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  dot: 'bg-amber-500'  },
  hold:     { label: 'Active Order', color: 'red',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    dot: 'bg-red-500'    },
};

const CAPACITIES = [2, 4, 6, 8];

const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterCapacity, setFilterCapacity] = useState('all');
  const [isPlaceOrderOpen, setIsPlaceOrderOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableGroupId, setNewTableGroupId] = useState('');
  const [mergeTable1, setMergeTable1] = useState('');
  const [mergeTable2, setMergeTable2] = useState('');
  const [mergeError, setMergeError] = useState('');
  const [addTableError, setAddTableError] = useState('');
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();
  const socketRef = useRef(null);

  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get('/table-groups');
      setGroups(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    fetchGroups();
  }, [fetchTables, fetchGroups]);

  // Real-time socket
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/admin`);
    socketRef.current = socket;

    socket.on('table:statusChanged', ({ tableId, status }) => {
      setTables(prev => prev.map(t =>
        t.id === tableId || t.id === parseInt(tableId)
          ? { ...t, status: status || t.status, is_occupied: status === 'free' ? 0 : 1 }
          : t
      ));
    });

    socket.on('table:merged', ({ tableId1, tableId2 }) => {
      setTables(prev => prev.map(t =>
        t.id === tableId2 || t.id === parseInt(tableId2) ? { ...t, merged_with_id: parseInt(tableId1) } : t
      ));
    });

    socket.on('table:unmerged', ({ tableId }) => {
      setTables(prev => prev.map(t =>
        (t.id === tableId || t.id === parseInt(tableId) || t.merged_with_id === tableId || t.merged_with_id === parseInt(tableId))
          ? { ...t, merged_with_id: null }
          : t
      ));
    });

    return () => socket.disconnect();
  }, []);

  // Filtered tables
  const filteredTables = tables.filter(t => {
    if (filterStatus !== 'all' && (t.status || 'free') !== filterStatus) return false;
    if (filterGroup !== 'all' && String(t.group_id) !== String(filterGroup)) return false;
    if (filterCapacity !== 'all' && String(t.capacity) !== String(filterCapacity)) return false;
    return true;
  });

  const counts = {
    free: tables.filter(t => (t.status || 'free') === 'free').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    hold: tables.filter(t => t.status === 'hold').length,
    total: tables.length,
  };

  // Create Table
  const createTable = async (e) => {
    e.preventDefault();
    setAddTableError('');
    if (!newTableNumber.trim()) { setAddTableError('Table number is required.'); return; }
    try {
      await api.post('/tables', {
        table_number: newTableNumber.trim(),
        capacity: newTableCapacity,
        group_id: newTableGroupId || null,
      });
      setNewTableNumber(''); setNewTableCapacity(4); setNewTableGroupId('');
      setShowAddTableModal(false);
      fetchTables();
    } catch (err) {
      setAddTableError(err.response?.data?.message || 'Error creating table.');
    }
  };

  // Create Group
  const createGroup = async () => {
    const name = window.prompt('Enter group name (e.g. Indoor Dining, 1st Floor):');
    if (!name?.trim()) return;
    try {
      await api.post('/table-groups', { name: name.trim() });
      fetchGroups();
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Error creating group.', { title: 'Error', danger: true });
    }
  };

  // Delete Group
  const deleteGroup = async (group) => {
    const confirmed = await showConfirm(`Delete group "${group.name}"?`, { title: 'Delete Group', danger: true, confirmLabel: 'Delete' });
    if (!confirmed) return;
    try {
      await api.delete(`/table-groups/${group.id}`);
      fetchGroups();
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Error deleting group.', { title: 'Error', danger: true });
    }
  };

  // Delete Table
  const handleDeleteTable = async (table) => {
    const confirmed = await showConfirm(`Delete ${table.table_number}? This cannot be undone.`, {
      title: 'Delete Table', danger: true, confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/tables/${table.id}`);
      fetchTables();
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Error deleting table.', { title: 'Error', danger: true });
    }
  };

  // Update table status
  const updateStatus = async (table, status) => {
    try {
      await api.patch(`/tables/${table.id}/status`, { status });
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, status } : t));
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Error updating table status.', { title: 'Error', danger: true });
    }
  };

  // Merge tables
  const handleMerge = async () => {
    setMergeError('');
    if (!mergeTable1 || !mergeTable2) { setMergeError('Please select both tables.'); return; }
    if (mergeTable1 === mergeTable2) { setMergeError('Cannot merge a table with itself.'); return; }
    try {
      await api.post('/tables/merge', { tableId1: parseInt(mergeTable1), tableId2: parseInt(mergeTable2) });
      setShowMergeModal(false);
      setMergeTable1(''); setMergeTable2('');
      fetchTables();
    } catch (err) {
      setMergeError(err.response?.data?.message || 'Error merging tables.');
    }
  };

  // Unmerge table
  const handleUnmerge = async (table) => {
    const confirmed = await showConfirm(`Unmerge ${table.table_number}?`, { title: 'Unmerge Table', confirmLabel: 'Unmerge' });
    if (!confirmed) return;
    try {
      await api.post(`/tables/${table.id}/unmerge`);
      fetchTables();
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Error unmerging table.', { title: 'Error', danger: true });
    }
  };

  // Open order modal for specific table
  const openOrderForTable = (table) => {
    setSelectedTableForOrder(table);
    setIsPlaceOrderOpen(true);
  };

  // Download QR
  const downloadQR = async (table) => {
    try {
      if (!table.qr_code_url) throw new Error('No QR code URL');
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = table.qr_code_url; });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 300; canvas.height = 400;
      ctx.fillStyle = '#0f0f0f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(table.table_number, canvas.width / 2, 40);
      ctx.drawImage(img, 50, 60, 200, 200);
      ctx.font = '14px sans-serif'; ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Scan QR to view menu', canvas.width / 2, 290);
      ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#F59E0B';
      ctx.fillText('Yummy Bites', canvas.width / 2, 370);
      const link = document.createElement('a');
      link.download = `${table.table_number.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      link.href = canvas.toDataURL('image/png'); link.click();
    } catch {
      await showAlert('Failed to download QR code.', { title: 'Error', danger: true });
    }
  };

  const mergableStatuses = ['free', 'occupied'];

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Tables
          </h1>
          <p className="text-gray-500 text-sm mt-1 flex gap-3">
            <span className="text-green-400 font-bold">{counts.free} free</span>
            <span className="text-gray-600">·</span>
            <span className="text-amber-400 font-bold">{counts.occupied} guests seated</span>
            <span className="text-gray-600">·</span>
            <span className="text-red-400 font-bold">{counts.hold} active orders</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{counts.total} total</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setIsPlaceOrderOpen(true)}
            className="flex items-center gap-2 bg-[#0f0f0f] border border-amber-500/40 hover:bg-amber-500/10 text-amber-400 font-bold px-4 py-2.5 rounded-xl transition-all text-sm uppercase tracking-wider cursor-pointer">
            <ShoppingBag size={15} /> Takeaway / Delivery
          </button>
          <button onClick={() => setShowMergeModal(true)}
            className="flex items-center gap-2 bg-[#0f0f0f] border border-blue-500/30 hover:bg-blue-500/10 text-blue-400 font-bold px-4 py-2.5 rounded-xl transition-all text-sm uppercase tracking-wider cursor-pointer">
            <GitMerge size={15} /> Merge Tables
          </button>
          <button onClick={createGroup}
            className="flex items-center gap-2 bg-[#0f0f0f] border border-purple-500/30 hover:bg-purple-500/10 text-purple-400 font-bold px-4 py-2.5 rounded-xl transition-all text-sm uppercase tracking-wider cursor-pointer">
            <Layers size={15} /> Add Group
          </button>
          <button onClick={() => { setAddTableError(''); setShowAddTableModal(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all text-sm uppercase tracking-wider cursor-pointer">
            <Plus size={16} strokeWidth={2.5} /> Add Table
          </button>
        </div>
      </motion.div>

      {/* Groups Summary */}
      {groups.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {groups.map(g => (
            <div key={g.id} className="flex items-center gap-2 bg-[#141414] border border-white/5 rounded-xl px-3 py-1.5 text-xs">
              <Layers size={12} className="text-purple-400" />
              <span className="text-gray-300 font-medium">{g.name}</span>
              <span className="text-gray-600">({tables.filter(t => t.group_id === g.id).length})</span>
              <button onClick={() => deleteGroup(g)} className="text-red-400/40 hover:text-red-400 ml-1 cursor-pointer transition-colors">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        {/* Status filter */}
        <div className="flex gap-1 bg-[#0f0f0f] border border-white/5 rounded-xl p-1">
          {[{ value: 'all', label: 'All' }, { value: 'free', label: '🟢 Free' }, { value: 'occupied', label: '🟡 Seated' }, { value: 'hold', label: '🔴 Active' }].map(opt => (
            <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterStatus === opt.value ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-gray-200'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Group filter */}
        {groups.length > 0 && (
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-gray-500" />
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
              className="bg-[#0f0f0f] border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500/50">
              <option value="all">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              <option value="">No Group</option>
            </select>
          </div>
        )}

        {/* Capacity filter */}
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-500" />
          <div className="flex gap-1">
            {['all', '2', '4', '6', '8'].map(c => (
              <button key={c} onClick={() => setFilterCapacity(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterCapacity === c ? 'bg-amber-500 text-black' : 'bg-[#0f0f0f] border border-white/5 text-gray-500 hover:text-gray-200'}`}>
                {c === 'all' ? 'All' : `${c}👥`}
              </button>
            ))}
          </div>
        </div>

        {(filterStatus !== 'all' || filterGroup !== 'all' || filterCapacity !== 'all') && (
          <button onClick={() => { setFilterStatus('all'); setFilterGroup('all'); setFilterCapacity('all'); }}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 cursor-pointer">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map((table, idx) => {
          const st = table.status || 'free';
          const sc = STATUS_CONFIG[st] || STATUS_CONFIG.free;
          const mergedWithTable = table.merged_with_id ? tables.find(t => t.id === table.merged_with_id) : null;
          const isMergedInto = tables.some(t => t.merged_with_id === table.id);

          return (
            <motion.div key={table.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className={`bg-[#0f0f0f] rounded-2xl border p-4 flex flex-col transition-all ${sc.border} ${sc.bg}/5`}>

              {/* Top: Status icon + badges */}
              <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sc.bg} border ${sc.border}`}>
                  <Grid3x3 size={18} className={sc.text} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  {table.group_name && (
                    <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {table.group_name}
                    </span>
                  )}
                  {table.capacity && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full">
                      <Users size={9} /> {table.capacity}
                    </span>
                  )}
                </div>
              </div>

              {/* Table name */}
              <h3 className="text-base font-bold text-gray-100 mb-1">{table.table_number}</h3>

              {/* Status pill */}
              <span className={`mb-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit flex items-center gap-1.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${st === 'hold' ? 'animate-pulse' : ''}`} />
                {sc.label}
              </span>

              {/* Merged badge */}
              {mergedWithTable && (
                <div className="mb-2 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1 flex items-center gap-1">
                  <GitMerge size={10} /> Merged into {mergedWithTable.table_number}
                </div>
              )}
              {isMergedInto && (
                <div className="mb-2 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1 flex items-center gap-1">
                  <GitMerge size={10} /> Has merged table
                </div>
              )}

              {/* QR */}
              {table.qr_code_url && (
                <div className="bg-white rounded-xl p-1.5 mb-3 self-center">
                  <img src={table.qr_code_url} alt={`QR for ${table.table_number}`} className="w-20 h-20" />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-auto">
                <button onClick={() => openOrderForTable(table)}
                  className="w-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-xs py-2 rounded-xl hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer">
                  <Utensils size={12} /> Place Order
                </button>

                {/* Status control */}
                {st === 'free' && (
                  <button onClick={() => updateStatus(table, 'occupied')}
                    className="w-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-xs py-2 rounded-xl hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                    <Users size={12} /> Mark Guests Seated
                  </button>
                )}
                {st === 'occupied' && (
                  <button onClick={() => updateStatus(table, 'free')}
                    className="w-full bg-green-500/10 text-green-400 border border-green-500/20 font-bold text-xs py-2 rounded-xl hover:bg-green-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                    <Check size={12} /> Mark Free
                  </button>
                )}
                {st === 'hold' && (
                  <div className="text-center text-xs text-red-400/70 py-1 font-medium">
                    Active order — bill to free
                  </div>
                )}

                {/* Unmerge */}
                {(mergedWithTable || isMergedInto) && (
                  <button onClick={() => handleUnmerge(table)}
                    className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-xs py-2 rounded-xl hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                    <X size={12} /> Unmerge
                  </button>
                )}

                <div className="flex gap-2">
                  <button onClick={() => downloadQR(table)}
                    className="flex-1 bg-white/5 text-gray-400 border border-white/10 font-medium text-xs py-2 rounded-xl hover:bg-white/10 hover:text-gray-200 transition-colors flex items-center justify-center gap-1 cursor-pointer">
                    <Download size={11} /> QR
                  </button>
                  <button onClick={() => handleDeleteTable(table)}
                    className="px-3 py-2 bg-red-500/5 border border-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredTables.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-600">
            <Grid3x3 size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No tables match your filters.</p>
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      <AnimatePresence>
        {showAddTableModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddTableModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0f0f0f] border border-amber-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-black text-white mb-5">Add New Table</h2>
              <form onSubmit={createTable} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Table Name / Number *</label>
                  <input type="text" value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)} placeholder="e.g. Table 11"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Seating Capacity</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CAPACITIES.map(c => (
                      <button key={c} type="button" onClick={() => setNewTableCapacity(c)}
                        className={`py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${newTableCapacity === c ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#1a1a1a] text-gray-400 border-white/10 hover:border-white/20'}`}>
                        {c} 👥
                      </button>
                    ))}
                  </div>
                </div>
                {groups.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Group (Optional)</label>
                    <select value={newTableGroupId} onChange={e => setNewTableGroupId(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50">
                      <option value="">No Group</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}
                {addTableError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={13} /> {addTableError}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddTableModal(false)}
                    className="flex-1 py-2.5 border border-white/10 text-gray-400 rounded-xl text-sm font-bold hover:bg-white/5 cursor-pointer transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black rounded-xl text-sm font-black cursor-pointer">
                    Add Table
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merge Tables Modal */}
      <AnimatePresence>
        {showMergeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMergeModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0f0f0f] border border-blue-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-black text-white mb-2">Merge Tables</h2>
              <p className="text-xs text-gray-500 mb-5">Only tables without active orders can be merged.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Primary Table (merge INTO)</label>
                  <select value={mergeTable1} onChange={e => setMergeTable1(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50">
                    <option value="">Select table...</option>
                    {tables.filter(t => mergableStatuses.includes(t.status || 'free') && !t.merged_with_id).map(t => (
                      <option key={t.id} value={t.id}>{t.table_number} ({t.status || 'free'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Table to Merge</label>
                  <select value={mergeTable2} onChange={e => setMergeTable2(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50">
                    <option value="">Select table...</option>
                    {tables.filter(t => mergableStatuses.includes(t.status || 'free') && !t.merged_with_id && String(t.id) !== String(mergeTable1)).map(t => (
                      <option key={t.id} value={t.id}>{t.table_number} ({t.status || 'free'})</option>
                    ))}
                  </select>
                </div>
                {mergeError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={13} /> {mergeError}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowMergeModal(false); setMergeError(''); }}
                    className="flex-1 py-2.5 border border-white/10 text-gray-400 rounded-xl text-sm font-bold hover:bg-white/5 cursor-pointer">
                    Cancel
                  </button>
                  <button onClick={handleMerge}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-black cursor-pointer flex items-center justify-center gap-2">
                    <GitMerge size={14} /> Merge
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppDialog dialogState={dialogState} closeDialog={closeDialog} />
      <PlaceOrderModal
        isOpen={isPlaceOrderOpen}
        onClose={() => { setIsPlaceOrderOpen(false); setSelectedTableForOrder(null); }}
        onOrderPlaced={() => fetchTables()}
        defaultOrderType={selectedTableForOrder ? 'dine_in' : 'takeaway'}
        preselectedTableId={selectedTableForOrder?.id}
      />
    </div>
  );
};

export default TablesPage;
