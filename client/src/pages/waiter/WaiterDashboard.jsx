import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Bell, CheckCircle2, UtensilsCrossed, TableProperties, RefreshCw,
  Utensils, Users, Check, Receipt, Printer, X
} from 'lucide-react';
import api from '../../api';
import { useAuthStore } from '../../store';

// Avatar color by name initial
const AVATAR_COLORS = [
  'from-amber-500 to-orange-500', 'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500', 'from-cyan-500 to-sky-500',
];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const WaiterDashboard = () => {
  const [tables, setTables] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [servingIds, setServingIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'free' | 'occupied' | 'hold'

  // Waiter Billing Modal
  const [billingTable, setBillingTable] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [billLoading, setBillLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [printBill, setPrintBill] = useState(false);
  const [billingSubmitting, setBillingSubmitting] = useState(false);

  const { token, name, logout } = useAuthStore();
  const navigate = useNavigate();

  const fetchTables = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await api.get('/tables');
      setTables(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/waiter`);

    socket.on('order:ready', (data) => {
      setReadyOrders(prev => {
        if (prev.find(o => o.kotId === data.kotId)) return prev;
        return [...prev, data];
      });
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🍽️ Order Ready!', { body: `${data.tableNumber} order is ready to serve!` });
      }
    });

    socket.on('kot:statusUpdate', (update) => {
      if (update.newStatus === 'served') {
        setReadyOrders(prev => prev.filter(o => o.kotId !== update.kotId));
      }
    });

    socket.on('table:statusChanged', () => fetchTables());

    return () => socket.disconnect();
  }, []);

  const markServed = async (kotId, orderId) => {
    setServingIds(prev => new Set(prev).add(kotId));
    try {
      await api.patch(`/kot/${kotId}/status`, { status: 'served' });
      setReadyOrders(prev => prev.filter(o => o.kotId !== kotId));
      fetchTables();
    } catch (err) {
      console.error(err);
    } finally {
      setServingIds(prev => { const s = new Set(prev); s.delete(kotId); return s; });
    }
  };

  const updateTableStatus = async (table, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/tables/${table.id}/status`, { status: newStatus });
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: newStatus, is_occupied: newStatus === 'free' ? 0 : 1 } : t));
    } catch (err) {
      console.error('Failed to update table status:', err);
    }
  };

  const openBillModal = async (table, e) => {
    if (e) e.stopPropagation();
    setBillingTable(table);
    setBillLoading(true);
    setPaymentMethod('Cash');
    setPrintBill(false);
    try {
      const res = await api.get(`/billing/${table.id}`);
      setBillDetails(res.data.data);
    } catch (err) {
      console.error('Failed to load bill details:', err);
      setBillDetails(null);
    } finally {
      setBillLoading(false);
    }
  };

  const handleSettleBill = async () => {
    if (!billingTable) return;
    setBillingSubmitting(true);
    try {
      await api.post(`/billing/${billingTable.id}/generate`, { payment_method: paymentMethod });
      if (printBill) {
        window.print();
      }
      setBillingTable(null);
      setBillDetails(null);
      fetchTables();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to settle bill.');
    } finally {
      setBillingSubmitting(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/waiter/login'); };

  const freeCount = tables.filter(t => (t.status || 'free') === 'free').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const holdCount = tables.filter(t => t.status === 'hold').length;

  const filteredTables = tables.filter(t => {
    const st = t.status || (t.is_occupied ? 'hold' : 'free');
    if (statusFilter === 'all') return true;
    return st === statusFilter;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <UtensilsCrossed size={17} className="text-black" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-base font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight leading-tight">
                Yummy Bites
              </h1>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest">Waiter Station</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center`}>
                <span className="text-white font-black text-sm">{(name || 'W').charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm font-bold text-gray-300 hidden sm:block">{name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-400 border border-white/10 hover:border-red-500/20 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stats Strip ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Tables', value: tables.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Active Orders', value: holdCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'Guests Seated', value: occupiedCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Free Tables', value: freeCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} border rounded-2xl px-4 py-4 text-center`}>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-600 uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Ready to Serve Orders ── */}
        <AnimatePresence>
          {readyOrders.length > 0 && (
            <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                  Ready to Serve ({readyOrders.length})
                </h2>
              </div>
              <div className="space-y-3">
                {readyOrders.map(order => (
                  <motion.div
                    key={order.kotId}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="bg-emerald-500/5 border-2 border-emerald-500/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(52,211,153,0.08)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Bell size={18} className="text-emerald-400 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-black text-gray-100 text-base">{order.tableNumber}</p>
                        <p className="text-emerald-400/70 text-xs uppercase tracking-widest">Order #{order.orderId} is ready!</p>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => markServed(order.kotId, order.orderId)}
                      disabled={servingIds.has(order.kotId)}
                      className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 font-black px-5 py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      {servingIds.has(order.kotId) ? 'Marking...' : 'Mark Served'}
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Tables Section with Filter Tabs ── */}
        <section>
          <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
            <div className="flex items-center gap-2">
              <TableProperties size={16} className="text-amber-500/60" />
              <h2 className="text-sm font-black text-gray-300 uppercase tracking-widest">Tables</h2>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0f0f0f] border border-white/5 rounded-xl p-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'free', label: '🟢 Free' },
                { key: 'occupied', label: '🟡 Seated' },
                { key: 'hold', label: '🔴 Active Orders' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === f.key
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-gray-500 hover:text-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchTables(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables.map((table, idx) => {
              const st = table.status || (table.is_occupied ? 'hold' : 'free');
              const isHold = st === 'hold';
              const isOccupied = st === 'occupied';
              const isFree = st === 'free';

              const borderClass = isHold
                ? 'bg-red-500/5 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                : isOccupied
                  ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                  : 'bg-[#0f0f0f] border-white/5 hover:border-amber-500/30';

              const dotClass = isHold
                ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)] animate-pulse'
                : isOccupied
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                  : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]';

              const statusLabel = isHold ? 'Active Order' : isOccupied ? 'Guests Seated' : 'Free';
              const statusTextClass = isHold ? 'text-red-400' : isOccupied ? 'text-amber-400' : 'text-emerald-400';

              return (
                <div
                  key={table.id}
                  className={`relative p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${borderClass}`}
                >
                  <div>
                    {/* Header: table number and status dot */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xl font-black text-gray-100">{table.table_number}</p>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${statusTextClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {table.capacity && (
                          <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-md">
                            👥 {table.capacity}
                          </span>
                        )}
                        <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                    {/* Free Table Actions */}
                    {isFree && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/menu/${table.id}`)}
                          className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Utensils size={13} /> Take Order
                        </button>
                        <button
                          onClick={(e) => updateTableStatus(table, 'occupied', e)}
                          className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          title="Mark Guests Seated"
                        >
                          <Users size={13} />
                        </button>
                      </div>
                    )}

                    {/* Occupied (Guests Seated) Table Actions */}
                    {isOccupied && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/menu/${table.id}`)}
                          className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Utensils size={13} /> Take Order
                        </button>
                        <button
                          onClick={(e) => updateTableStatus(table, 'free', e)}
                          className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          title="Mark Free"
                        >
                          <Check size={13} />
                        </button>
                      </div>
                    )}

                    {/* Active Order (Hold) Table Actions */}
                    {isHold && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/menu/${table.id}`)}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Utensils size={13} /> + Add Items
                        </button>
                        <button
                          onClick={(e) => openBillModal(table, e)}
                          className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)] cursor-pointer"
                        >
                          <Receipt size={13} /> Bill Table
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTables.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-600 bg-[#0f0f0f] border border-white/5 rounded-2xl">
                <TableProperties size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tables found matching status filter.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── WAITER BILLING MODAL (WITH PRINT BILL CHECKBOX) ── */}
      <AnimatePresence>
        {billingTable && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setBillingTable(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0f0f0f] border border-amber-500/20 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h3 className="font-serif font-black text-lg text-gray-100">
                    Bill {billingTable.table_number}
                  </h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                    Complete & Settle Session
                  </p>
                </div>
                <button onClick={() => setBillingTable(null)} className="text-gray-500 hover:text-gray-300">
                  <X size={18} />
                </button>
              </div>

              {billLoading ? (
                <div className="py-12 text-center text-gray-500 text-sm animate-pulse">
                  Loading active orders...
                </div>
              ) : billDetails ? (
                <div className="space-y-4">
                  {/* Order items preview */}
                  <div className="bg-[#141414] border border-white/5 rounded-xl p-3.5 max-h-48 overflow-y-auto space-y-2 text-xs">
                    {billDetails.orders?.map(ord => (
                      <div key={ord.id} className="space-y-1 pb-2 border-b border-white/5 last:border-0 last:pb-0">
                        <div className="flex justify-between font-bold text-gray-300">
                          <span>Order #{ord.order_number || ord.id}</span>
                          <span className="text-amber-500 font-mono">₹{ord.total_amount}</span>
                        </div>
                        {ord.items?.map(it => (
                          <div key={it.id} className="flex justify-between text-gray-400 pl-2">
                            <span>{it.quantity}× {it.name}</span>
                            <span className="font-mono">₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'Card', 'UPI'].map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                            paymentMethod === method
                              ? 'bg-amber-500 text-black border-amber-500 font-black'
                              : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Small Print Bill Checkbox as requested */}
                  <div className="bg-[#141414] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Printer size={16} className={printBill ? 'text-amber-500' : 'text-gray-500'} />
                      <label htmlFor="printBillCheckbox" className="text-xs font-bold text-gray-200 cursor-pointer select-none">
                        Print Bill on settle?
                      </label>
                    </div>
                    <input
                      id="printBillCheckbox"
                      type="checkbox"
                      checked={printBill}
                      onChange={e => setPrintBill(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                    />
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total Bill:</span>
                    <span className="text-3xl font-black text-amber-500 font-mono">
                      ₹{billDetails.grandTotal || 0}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBillingTable(null)}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-gray-200 font-bold text-xs uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={billingSubmitting}
                      onClick={handleSettleBill}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {billingSubmitting ? 'Settling...' : 'Settle & Free Table'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-red-400 text-xs">
                  No active orders found for this table.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default WaiterDashboard;
