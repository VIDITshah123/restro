import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Bell, CheckCircle2, UtensilsCrossed, TableProperties, RefreshCw,
  Utensils, Users, Check, Receipt, Printer, X, Ban, ShoppingBag, Bike, Eye,
  Clock, ShieldAlert, Sparkles, Volume2
} from 'lucide-react';
import api from '../../api';
import { useAuthStore } from '../../store';
import PlaceOrderModal from '../../components/admin/PlaceOrderModal';

// Avatar color by name initial
const AVATAR_COLORS = [
  'from-amber-500 to-orange-500', 'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500', 'from-cyan-500 to-sky-500',
];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// 5-second Web Audio Synthesizer Alert
const play5SecondAlertChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;

    // 5-second alternating chime pattern (A5 880Hz, D6 1174Hz)
    for (let i = 0; i < 10; i++) {
      const t = now + (i * 0.5);
      const freq = (i % 2 === 0) ? 880 : 1174.66;
      osc.frequency.setValueAtTime(freq, t);
    }

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.setValueAtTime(0.35, now + 4.8);
    gain.gain.linearRampToValueAtTime(0.001, now + 5.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 5.0);
  } catch (err) {
    console.error('AudioContext chime error:', err);
  }
};

const WaiterDashboard = () => {
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'kds'
  const [tables, setTables] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [servingIds, setServingIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'free' | 'occupied' | 'hold'

  // KDS Live Orders (Task 10)
  const [liveKdsOrders, setLiveKdsOrders] = useState([]);
  const [kdsLoading, setKdsLoading] = useState(false);

  // 5-Second Alert Toast (Task 10)
  const [activeAlert, setActiveAlert] = useState(null); // { message, tableNumber, progress }
  const alertTimerRef = useRef(null);

  // Waiter Order Placement Modal (Task 9)
  const [isPlaceOrderOpen, setIsPlaceOrderOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);
  const [orderModalType, setOrderModalType] = useState('dine_in');

  // Waiter Billing Modal
  const [billingTable, setBillingTable] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [billLoading, setBillLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [printBill, setPrintBill] = useState(false);
  const [billingSubmitting, setBillingSubmitting] = useState(false);

  const { token, name, email, permissions = {}, waiterId, logout } = useAuthStore();
  const navigate = useNavigate();

  // Task 9 Permissions
  const canPlaceOrder = permissions?.can_place_order !== false; // default true
  const canCancelOrder = Boolean(permissions?.can_cancel_order);
  const canPlaceOnline = Boolean(permissions?.can_place_online_order);
  const canPlaceTakeawayDelivery = Boolean(permissions?.can_place_takeaway_delivery);

  const trigger5SecondAlert = useCallback((orderInfo) => {
    play5SecondAlertChime();
    if (alertTimerRef.current) clearInterval(alertTimerRef.current);

    const startTime = Date.now();
    const duration = 5000;
    setActiveAlert({
      ...orderInfo,
      progress: 100
    });

    alertTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      if (remainingPct <= 0) {
        clearInterval(alertTimerRef.current);
        setActiveAlert(null);
      } else {
        setActiveAlert(prev => prev ? { ...prev, progress: remainingPct } : null);
      }
    }, 100);
  }, []);

  const fetchTables = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await api.get('/tables');
      setTables(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchLiveKdsOrders = useCallback(async () => {
    setKdsLoading(true);
    try {
      const res = await api.get('/waiters/my-orders');
      setLiveKdsOrders(res.data.data || []);
    } catch (err) {
      console.error('Failed to load waiter KDS orders:', err);
    } finally {
      setKdsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    fetchLiveKdsOrders();

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/waiter`);

    // Task 10: 5-second continuous alert sound when order is ready
    socket.on('order:ready', (data) => {
      setReadyOrders(prev => {
        if (prev.find(o => o.kotId === data.kotId)) return prev;
        return [...prev, data];
      });

      // Sound 5-second continuous chime & show countdown banner
      trigger5SecondAlert({
        tableNumber: data.tableNumber,
        orderId: data.orderId,
        kotId: data.kotId
      });

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🍽️ Order Ready!', { body: `${data.tableNumber} order is ready to serve!` });
      }

      fetchLiveKdsOrders();
    });

    socket.on('kot:statusUpdate', (update) => {
      if (update.newStatus === 'served') {
        setReadyOrders(prev => prev.filter(o => o.kotId !== update.kotId));
      }
      fetchLiveKdsOrders();
    });

    socket.on('table:statusChanged', () => fetchTables());

    return () => {
      socket.disconnect();
      if (alertTimerRef.current) clearInterval(alertTimerRef.current);
    };
  }, [fetchTables, fetchLiveKdsOrders, trigger5SecondAlert]);

  const markServed = async (kotId, orderId) => {
    setServingIds(prev => new Set(prev).add(kotId));
    try {
      await api.patch(`/kot/${kotId}/status`, { status: 'served' });
      setReadyOrders(prev => prev.filter(o => o.kotId !== kotId));
      fetchTables();
      fetchLiveKdsOrders();
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

  // Task 9: Waiter cancel order item if permission granted
  const handleCancelOrderItem = async (orderItemId) => {
    if (!canCancelOrder) {
      alert('You do not have permission to cancel orders. Contact Admin.');
      return;
    }
    const reason = window.prompt('Enter cancellation reason (e.g. Guest changed mind, unavailable):');
    if (!reason || !reason.trim()) return;

    try {
      await api.patch(`/order-items/${orderItemId}/cancel`, { reason: reason.trim() });
      fetchLiveKdsOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel item.');
    }
  };

  const openOrderForTable = (table) => {
    if (!canPlaceOrder) {
      alert('Placing orders is disabled for your waiter account. Contact Admin.');
      return;
    }
    setSelectedTableForOrder(table);
    setOrderModalType('dine_in');
    setIsPlaceOrderOpen(true);
  };

  const openDirectOrder = (type) => {
    if (!canPlaceTakeawayDelivery) {
      alert('Takeaway & Delivery ordering is disabled for your account.');
      return;
    }
    setSelectedTableForOrder(null);
    setOrderModalType(type);
    setIsPlaceOrderOpen(true);
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
      fetchLiveKdsOrders();
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

      {/* Task 10: 5-Second Continuous Alert Sound Toast / Banner */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
          >
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-emerald-400/40 overflow-hidden relative">
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center animate-bounce">
                    <Volume2 size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                        5s Chime Alert
                      </span>
                      <h4 className="font-serif font-black text-base">{activeAlert.tableNumber} Order Ready!</h4>
                    </div>
                    <p className="text-xs text-white/90 font-medium mt-0.5">
                      Order #{activeAlert.orderId} is prepared and hot to serve!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveAlert(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg bg-black/10"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 5-second countdown progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                <div
                  className="h-full bg-yellow-300 transition-all ease-linear duration-100"
                  style={{ width: `${activeAlert.progress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <UtensilsCrossed size={17} className="text-black" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-base font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight leading-tight">
                Yummy Bites
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Waiter Terminal</p>
            </div>
          </div>

          {/* Tab Switcher: Tables vs Live KDS Overview */}
          <div className="flex items-center gap-1 bg-[#141414] border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TableProperties size={13} /> Tables Floor
            </button>
            <button
              onClick={() => { setActiveTab('kds'); fetchLiveKdsOrders(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'kds'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye size={13} /> Live KDS Overview
              {liveKdsOrders.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'kds' ? 'bg-black text-amber-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {liveKdsOrders.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Task 9: Takeaway / Delivery shortcuts if permission granted */}
            {canPlaceTakeawayDelivery && (
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => openDirectOrder('takeaway')}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Place Takeaway Order"
                >
                  <ShoppingBag size={12} /> Takeaway
                </button>
                <button
                  onClick={() => openDirectOrder('delivery')}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Place Delivery Order"
                >
                  <Bike size={12} /> Delivery
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center`}>
                <span className="text-white font-black text-xs">{(name || 'W').charAt(0).toUpperCase()}</span>
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-gray-200 block leading-tight">{name || 'Waiter'}</span>
                <span className="text-[10px] text-gray-500 font-mono truncate max-w-[120px] block">{email}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-400 border border-white/10 hover:border-red-500/20 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Ready to Serve Orders Bar */}
        <AnimatePresence>
          {readyOrders.length > 0 && (
            <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                  Ready to Serve ({readyOrders.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {readyOrders.map(order => (
                  <motion.div
                    key={order.kotId}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(52,211,153,0.12)]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <Bell size={18} className="text-emerald-400 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-black text-gray-100 text-base">{order.tableNumber}</p>
                        <p className="text-emerald-400/80 text-xs uppercase tracking-wider font-mono">
                          Order #{order.orderId} is Ready
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => markServed(order.kotId, order.orderId)}
                      disabled={servingIds.has(order.kotId)}
                      className="flex items-center gap-1.5 bg-emerald-500 text-black hover:bg-emerald-400 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 size={14} />
                      {servingIds.has(order.kotId) ? 'Serving...' : 'Mark Served'}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* TAB 1: TABLES FLOOR PLAN */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Tables', value: tables.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Active Orders', value: holdCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                { label: 'Guests Seated', value: occupiedCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Free Tables', value: freeCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} border rounded-2xl px-4 py-4 text-center`}>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Filter Tabs & Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-[#0f0f0f] border border-white/5 rounded-xl p-1">
                {[
                  { key: 'all', label: 'All Tables' },
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
                Refresh Tables
              </button>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTables.map(table => {
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
                      {isFree && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openOrderForTable(table)}
                            disabled={!canPlaceOrder}
                            className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={canPlaceOrder ? 'Take order for table' : 'Ordering permission disabled'}
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

                      {isOccupied && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openOrderForTable(table)}
                            disabled={!canPlaceOrder}
                            className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

                      {isHold && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openOrderForTable(table)}
                            disabled={!canPlaceOrder}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                          >
                            <Utensils size={13} /> + Add
                          </button>
                          <button
                            onClick={(e) => openBillModal(table, e)}
                            className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)] cursor-pointer"
                          >
                            <Receipt size={13} /> Bill
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE KDS OVERVIEW (Task 10 - Read-Only Live Overview) */}
        {activeTab === 'kds' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-amber-500" />
                  <h2 className="text-xl font-serif font-black text-gray-100">Live KDS Overview</h2>
                  <span className="text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Read-Only
                  </span>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                  Live kitchen preparation status for placed orders
                </p>
              </div>

              <button
                onClick={fetchLiveKdsOrders}
                disabled={kdsLoading}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw size={12} className={kdsLoading ? 'animate-spin' : ''} />
                Refresh KDS
              </button>
            </div>

            {kdsLoading ? (
              <div className="py-24 text-center text-gray-500 animate-pulse text-sm">
                Fetching live kitchen tickets...
              </div>
            ) : liveKdsOrders.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-white/10 rounded-3xl text-gray-600">
                <UtensilsCrossed size={42} className="mx-auto mb-2 opacity-30" />
                <p className="font-serif italic text-base">No active orders in kitchen right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveKdsOrders.map(ord => {
                  const status = ord.kot_status || ord.status || 'received';
                  const isReady = status === 'ready';
                  const isPreparing = status === 'preparing';
                  const isReceived = status === 'received';

                  const badgeClass = isReady
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                    : isPreparing
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/40';

                  return (
                    <div
                      key={ord.id}
                      className={`bg-[#0f0f0f] border-2 rounded-2xl p-5 flex flex-col justify-between transition-all ${
                        isReady
                          ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : isPreparing
                            ? 'border-amber-500/30'
                            : 'border-white/10'
                      }`}
                    >
                      <div>
                        {/* Header: Table & KOT Number */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-lg font-black text-gray-100 block">
                              {ord.table_number}
                            </span>
                            <span className="text-[11px] font-mono text-gray-500">
                              Order #{ord.order_number || ord.id} {ord.kot_number ? `· ${ord.kot_number}` : ''}
                            </span>
                          </div>

                          {/* Read-Only Status Badge (Cannot update status) */}
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${badgeClass}`}>
                            {status}
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="space-y-2 py-3 border-t border-b border-white/5 my-2 max-h-48 overflow-y-auto">
                          {ord.items?.map(it => (
                            <div key={it.id} className="text-xs">
                              <div className="flex justify-between items-start">
                                <span className={`font-bold ${it.is_cancelled ? 'line-through text-red-400/60' : 'text-gray-200'}`}>
                                  {it.quantity}× {it.name}
                                </span>
                                {canCancelOrder && !it.is_cancelled && status !== 'served' && (
                                  <button
                                    onClick={() => handleCancelOrderItem(it.id)}
                                    className="text-[10px] text-red-400/80 hover:text-red-400 hover:underline cursor-pointer"
                                    title="Cancel this dish"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                              {it.special_notes && (
                                <p className="text-[10px] text-amber-500/80 italic pl-3">
                                  {it.special_notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer: Elapsed timestamp */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={11} /> {new Date(ord.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                          Kitchen View Only
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Place Order Modal (Task 3, 4, 6, 9) */}
      <PlaceOrderModal
        isOpen={isPlaceOrderOpen}
        onClose={() => setIsPlaceOrderOpen(false)}
        defaultOrderType={orderModalType}
        preselectedTableId={selectedTableForOrder?.id || null}
        onOrderPlaced={() => {
          fetchTables();
          fetchLiveKdsOrders();
        }}
      />

      {/* Waiter Billing Modal */}
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
                    Settle Table Session
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

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Bill Due</span>
                    <span className="text-2xl font-black text-amber-500 font-mono">
                      ₹{billDetails.total || billDetails.orders?.reduce((s, o) => s + o.total_amount, 0) || 0}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-bold block mb-1.5">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'UPI / QR', 'Card'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            paymentMethod === m
                              ? 'bg-amber-500 text-black border-amber-500'
                              : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSettleBill}
                    disabled={billingSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {billingSubmitting ? 'Settling...' : 'Settle & Free Table'}
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No active orders to bill for this table.
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
