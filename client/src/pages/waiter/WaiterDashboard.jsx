import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Bell, CheckCircle2, UtensilsCrossed, TableProperties, RefreshCw } from 'lucide-react';
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
  const { token, name, logout } = useAuthStore();
  const navigate = useNavigate();

  const fetchTables = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await api.get('/tables');
      setTables(res.data.data);
    } catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    fetchTables();
    const socket = io('http://localhost:3000/waiter');

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
    } catch (err) { console.error(err); }
    finally { setServingIds(prev => { const s = new Set(prev); s.delete(kotId); return s; }); }
  };

  const handleLogout = () => { logout(); navigate('/waiter/login'); };

  const freeCount = tables.filter(t => !t.is_occupied).length;
  const occupiedCount = tables.filter(t => t.is_occupied).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <UtensilsCrossed size={17} className="text-black" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-base font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight leading-tight">
                Cafe Fillo
              </h1>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest">Waiter Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Waiter avatar */}
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center`}>
                <span className="text-white font-black text-sm">{(name || 'W').charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm font-bold text-gray-300 hidden sm:block">{name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-400 border border-white/10 hover:border-red-500/20 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all uppercase tracking-wider"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stats Strip ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Tables', value: tables.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Occupied', value: occupiedCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'Free', value: freeCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} border rounded-2xl px-4 py-4 text-center`}>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-600 uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Ready Orders ── */}
        <AnimatePresence>
          {readyOrders.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                  Ready to Serve — {readyOrders.length}
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
                      className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 font-black px-5 py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50"
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

        {/* ── Tables Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TableProperties size={16} className="text-amber-500/60" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">All Tables</h2>
            </div>
            <button
              onClick={() => fetchTables(true)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-amber-400 transition-colors"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {tables.map((table, idx) => (
              <motion.button
                key={table.id}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/menu/${table.id}`)}
                className={`relative p-5 rounded-2xl border-2 text-center transition-all ${
                  table.is_occupied
                    ? 'bg-red-500/5 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                    : 'bg-[#0f0f0f] border-white/5 hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                }`}
              >
                {/* Status dot */}
                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${table.is_occupied ? 'bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.6)]' : 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]'}`} />

                <p className="text-xl font-black text-gray-100 mb-1">{table.table_number}</p>
                <span className={`text-[10px] font-black uppercase tracking-wider ${table.is_occupied ? 'text-red-400' : 'text-emerald-400'}`}>
                  {table.is_occupied ? 'Occupied' : 'Free'}
                </span>
                {!table.is_occupied && (
                  <p className="text-[9px] text-gray-700 mt-1 uppercase tracking-widest">Tap to order</p>
                )}
              </motion.button>
            ))}

            {tables.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <TableProperties size={40} className="mx-auto mb-3 text-gray-800" strokeWidth={1} />
                <p className="text-gray-700 text-sm">No tables found</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default WaiterDashboard;
