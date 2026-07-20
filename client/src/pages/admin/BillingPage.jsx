import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../../api';
import { toISTFull } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Receipt, Loader2, Printer, Flag } from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';
import ThermalReceipt from '../../components/admin/ThermalReceipt';

const BillingPage = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeReports, setActiveReports] = useState([]);
  const [sortOption, setSortOption] = useState('Table (Asc)');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();

  const loadBillRequests = () => {
    try { return new Set(JSON.parse(localStorage.getItem('billRequestedTables') || '[]')); }
    catch { return new Set(); }
  };
  const [billRequestedTables, setBillRequestedTables] = useState(loadBillRequests);

  const persistBillRequests = (tableSet) => {
    localStorage.setItem('billRequestedTables', JSON.stringify([...tableSet]));
    window.dispatchEvent(new Event('billRequestsUpdated'));
  };

  const addNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  useEffect(() => {
    fetchTables();
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/admin`);
    socket.on('notification:bill_request', (data) => {
      setBillRequestedTables(prev => {
        const next = new Set(prev);
        next.add(data.tableId || data.tableNumber);
        persistBillRequests(next); return next;
      });
      addNotification(`Table ${data.tableNumber || data.tableId} requested bill!`);
    });
    socket.on('table:statusChanged', (data) => {
      setTables(prev => {
        const existing = prev.find(t => t.id === data.tableId);
        if (existing) return prev.map(t => t.id === data.tableId ? { ...t, is_occupied: data.isOccupied } : t);
        fetchTables(); return prev;
      });
    });
    return () => socket.disconnect();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      const fetchedTables = res.data.data;
      setTables(fetchedTables);
      setBillRequestedTables(prev => {
        const occupiedIds = new Set(fetchedTables.filter(t => t.is_occupied).map(t => t.id));
        const occupiedNames = new Set(fetchedTables.filter(t => t.is_occupied).map(t => t.table_number));
        const next = new Set([...prev].filter(id => occupiedIds.has(id) || occupiedNames.has(id)));
        if (next.size !== prev.size) persistBillRequests(next);
        return next;
      });
    } catch (err) { console.error(err); }
  };

  const fetchBilling = async (tableId) => {
    setLoading(true); setSelectedTable(tableId);
    try { 
      const res = await api.get(`/billing/${tableId}`); 
      setBilling(res.data.data); 
      const reportsRes = await api.get(`/reports/table/${tableId}`);
      setActiveReports(reportsRes.data.data || []);
    }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleGenerateBill = async () => {
    if (!selectedTable) return;
    const tableName = tables.find(t => t.id === selectedTable)?.table_number || 'this table';
    const confirmed = await showConfirm(
      `Generate bill for ${tableName} via ${paymentMethod}?`,
      { title: 'Generate Bill', confirmLabel: 'Generate Bill' }
    );
    if (!confirmed) return;
    try {
      await api.post(`/billing/${selectedTable}/generate`, { payment_method: paymentMethod });
      setBillRequestedTables(prev => {
        const next = new Set(prev); next.delete(selectedTable); persistBillRequests(next); return next;
      });
      setBilling(null); setSelectedTable(null); setActiveReports([]); fetchTables();
      await showAlert('Bill generated! Table is now free.', { title: 'Success ✓' });
    } catch (err) {
      await showAlert('Failed to generate bill. Please try again.', { title: 'Error', danger: true });
    }
  };

  let occupiedTables = tables.filter(t => t.is_occupied);
  if (sortOption === 'Table (Asc)') occupiedTables.sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));
  else occupiedTables.sort((a, b) => b.table_number.localeCompare(a.table_number, undefined, { numeric: true }));

  return (
    <div className="p-8 flex gap-6 min-h-screen bg-[#0a0a0a] text-gray-200">

      {/* Left Panel */}
      <div className="w-64 shrink-0">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
              Billing
            </h1>
          </div>
          <div className="mb-4">
            <select value={sortOption} onChange={e => setSortOption(e.target.value)} className="w-full bg-[#0f0f0f] border border-white/10 text-gray-400 text-xs rounded-xl px-3 py-2 outline-none uppercase tracking-wider">
              <option>Table (Asc)</option>
              <option>Table (Desc)</option>
            </select>
          </div>
          <p className="text-xs text-gray-600 mb-4 uppercase tracking-wider">Select an occupied table to view and generate their bill.</p>

          {occupiedTables.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6 text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-gray-600 text-sm uppercase tracking-widest">No occupied tables</p>
            </div>
          ) : (
            <div className="space-y-2">
              {occupiedTables.map(table => {
                const isRequested = billRequestedTables.has(table.id) || billRequestedTables.has(table.table_number);
                const isSelected = selectedTable === table.id;
                return (
                  <button
                    key={table.id}
                    onClick={() => fetchBilling(table.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all font-bold relative text-sm ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
                        : isRequested
                          ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse'
                          : 'bg-[#0f0f0f] border-white/5 text-gray-300 hover:border-white/20 hover:text-gray-100'
                    }`}
                  >
                    {table.table_number}
                    {isRequested && (
                      <span className="absolute top-2 right-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        Bill!
                      </span>
                    )}
                    <span className="block text-xs font-normal opacity-50 mt-0.5">Tap to view bill</span>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="flex-1">
        {!selectedTable && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center justify-center">
            <div className="text-center">
              <Receipt size={56} className="text-gray-800 mx-auto mb-4" strokeWidth={1} />
              <p className="font-serif text-gray-600 text-lg italic">Select a table to view bill</p>
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={32} className="text-amber-500/40 animate-spin" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {billing && !loading && (
            <motion.div
              key={selectedTable}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6"
            >
              {activeReports.length > 0 && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col gap-2 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <Flag size={16} className="text-red-500 animate-pulse" />
                    Active Issues Reported by Customer
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {activeReports.map(rep => (
                      <div key={rep.id} className="text-xs text-gray-300 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                        <span className="font-semibold text-white">{rep.type === 'food' ? '🍽️ Food' : '⚠️ Other'}:</span> "{rep.description}" 
                        <span className="text-[10px] text-gray-500 block mt-0.5">{new Date(rep.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-serif font-black text-gray-100">
                      {tables.find(t => t.id === selectedTable)?.table_number}
                    </h2>
                    <p className="text-amber-500/60 text-xs mt-1 uppercase tracking-widest">{billing.orders.length} order(s) in session</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => window.print()}
                      disabled={billing.orders.length === 0}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 font-bold px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider text-xs cursor-pointer"
                    >
                      <Printer size={14} /> Print Receipt
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleGenerateBill}
                      disabled={billing.orders.length === 0}
                      className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black px-4 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                    >
                      <Receipt size={14} /> Generate Bill
                    </motion.button>
                  </div>
                </div>

                {/* Payment method selector — always visible & reactive */}
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-2">Payment Method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Online', 'Card'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2.5 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all ${
                          paymentMethod === m
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {billing.orders.length === 0 ? (
                <p className="text-gray-600 text-center py-10 text-sm italic">No pending orders for this table.</p>
              ) : (
                <div className="space-y-4">
                  {billing.orders.map(order => (
                    <div key={order.id} className="border border-white/5 rounded-2xl overflow-hidden">
                      <div className="bg-black/40 px-5 py-3 flex justify-between text-xs text-gray-500 uppercase tracking-widest border-b border-white/5">
                        <span>Order #{order.id}</span>
                        <span>{toISTFull(order.placed_at)}</span>
                      </div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-white/5">
                          {order.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-5 py-3 text-gray-300">
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {item.name}
                                {item.special_notes && (
                                  <span className="ml-2 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">{item.special_notes}</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-center text-gray-600 text-xs">×{item.quantity}</td>
                              <td className="px-5 py-3 text-right font-black text-gray-300">₹{item.price * item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-5 py-3 bg-black/40 flex justify-between text-xs font-bold border-t border-white/5">
                        <span className="text-gray-500 uppercase tracking-wider">Subtotal</span>
                        <span className="text-amber-500">₹{order.total_amount}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t-2 border-amber-500/20 pt-5 mt-2 flex justify-between items-center">
                    <span className="font-serif text-gray-400 tracking-wider text-sm uppercase">Grand Total</span>
                    <span className="text-3xl font-black text-amber-500">₹{billing.grandTotal}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {notifications.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0f0f0f] border border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.1)] rounded-2xl p-4 pointer-events-auto flex items-start gap-3"
            >
              <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl shrink-0">
                <Bell size={18} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-200 uppercase tracking-wider">Bill Request</p>
                <p className="text-gray-400 text-sm mt-0.5">{note.message}</p>
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== note.id))} className="text-gray-600 hover:text-gray-300 p-1 transition-colors">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Dialog */}
      <AppDialog dialogState={dialogState} closeDialog={closeDialog} />

      {/* Hidden print receipt area */}
      {billing && (
        <ThermalReceipt
          tableNumber={tables.find(t => t.id === selectedTable)?.table_number}
          orders={billing.orders}
          grandTotal={billing.grandTotal}
          paymentMethod={paymentMethod}
        />
      )}
    </div>
  );
};

export default BillingPage;
