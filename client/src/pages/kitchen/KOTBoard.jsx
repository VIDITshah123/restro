import { useState, useEffect } from 'react';
import { useKOTSocket } from '../../hooks/useSocket';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChefHat, CheckCircle2, Bell, History } from 'lucide-react';

const STATUS_CONFIG = {
  received: {
    glow: 'shadow-[0_0_20px_rgba(148,163,184,0.15)]',
    border: 'border-slate-500/40',
    bar: 'bg-slate-400',
    label: 'text-slate-400',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
  accepted: {
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
    border: 'border-blue-500/40',
    bar: 'bg-blue-400',
    label: 'text-blue-400',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  preparing: {
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.2)]',
    border: 'border-orange-500/40',
    bar: 'bg-orange-400',
    label: 'text-orange-400',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  ready: {
    glow: 'shadow-[0_0_25px_rgba(34,197,94,0.25)]',
    border: 'border-green-500/50',
    bar: 'bg-green-400',
    label: 'text-green-400',
    badge: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
};

const KOTCard = ({ kot, onStatusUpdate }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(kot.generated_at + 'Z').getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 60000));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [kot.generated_at]);

  const handleUpdate = async (status) => {
    try {
      await api.patch(`/kot/${kot.id}/status`, { status });
      onStatusUpdate(kot.id, status);
    } catch { alert('Error updating status'); }
  };

  const cfg = STATUS_CONFIG[kot.status] || STATUS_CONFIG.received;
  const isUrgent = elapsed >= 15 && kot.status !== 'ready';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative bg-[#0f0f0f] border ${cfg.border} rounded-2xl flex flex-col overflow-hidden ${cfg.glow} transition-all`}
    >
      {/* Status bar accent */}
      <div className={`h-1 w-full ${cfg.bar} ${kot.status === 'ready' ? 'animate-pulse' : ''}`} />

      {/* Urgency warning */}
      {isUrgent && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
          <span className="text-red-400 text-xs font-black uppercase tracking-widest">Urgent — {elapsed}m</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start px-4 pt-4 pb-3 border-b border-white/5">
        <div>
          <h2 className="text-lg font-black text-amber-500 font-mono tracking-tight">{kot.kot_number}</h2>
          <p className="text-gray-300 font-bold text-sm mt-0.5">{kot.table_number || kot.tableNumber || '—'}</p>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1.5 justify-end ${isUrgent ? 'text-red-400' : 'text-gray-600'}`}>
            <Clock size={12} />
            <span className="font-mono text-xs font-bold">{elapsed}m ago</span>
          </div>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.badge}`}>
            {kot.status}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto max-h-72">
        {kot.items.map((item, idx) => {
          const notesLower = (item.special_notes || '').toLowerCase();
          const isHalfJain = notesLower.includes('half jain');
          const isJain = !isHalfJain && notesLower.includes('jain');
          const isCombo = item.category === 'Combo Meals' || (item.description || '').includes('- ');

          // Parse combo sub-items from description (lines starting with "- ")
          const subItems = isCombo
            ? (item.description || '')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.startsWith('- '))
                .map(l => l.slice(2).trim())
            : [];

          return (
            <div key={idx} className={`${isCombo ? 'bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5' : ''}`}>
              <div className="flex gap-3 items-start">
                <span className="font-black text-amber-500 text-base min-w-[2rem]">{item.quantity}×</span>
                <div className="flex-1">
                  <p className={`font-bold text-base leading-tight ${
                    isHalfJain ? 'text-yellow-300' : isJain ? 'text-red-300' : 'text-gray-200'
                  }`}>
                    {item.name}
                    {isCombo && (
                      <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Combo</span>
                    )}
                    {isHalfJain && <span className="ml-1.5 text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Half Jain</span>}
                    {isJain && <span className="ml-1.5 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Jain</span>}
                  </p>

                  {/* Combo sub-items */}
                  {subItems.length > 0 && (
                    <div className="mt-2 space-y-1 pl-1 border-l-2 border-amber-500/20">
                      {subItems.map((sub, i) => (
                        <p key={i} className="text-xs text-amber-400/70 font-medium leading-tight">
                          <span className="text-amber-600 mr-1.5">›</span>{sub}
                        </p>
                      ))}
                    </div>
                  )}

                  {item.special_notes?.trim() && (
                    <span className="inline-block mt-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] px-2 py-0.5 rounded-lg font-bold">
                      📝 {item.special_notes}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="px-4 pb-4 pt-3 border-t border-white/5">
        {kot.status === 'received' && (
          <button onClick={() => handleUpdate('accepted')} className="w-full flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 font-black py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_12px_rgba(59,130,246,0.2)]">
            <CheckCircle2 size={16} /> Accept
          </button>
        )}
        {kot.status === 'accepted' && (
          <button onClick={() => handleUpdate('preparing')} className="w-full flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 font-black py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_12px_rgba(251,146,60,0.2)]">
            <ChefHat size={16} /> Start Preparing
          </button>
        )}
        {kot.status === 'preparing' && (
          <button onClick={() => handleUpdate('ready')} className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20 font-black py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_12px_rgba(34,197,94,0.2)]">
            <Bell size={16} /> Mark Ready
          </button>
        )}
        {kot.status === 'ready' && (
          <button onClick={() => handleUpdate('served')} className="w-full flex items-center justify-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 font-black py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_12px_rgba(168,85,247,0.2)] animate-pulse">
            ✅ Mark Served
          </button>
        )}
      </div>
    </motion.div>
  );
};

const KOTBoard = () => {
  const [kots, setKots] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/kot').then(res => setKots(res.data.data)).catch(console.error);
  }, []);

  const playChime = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  };

  useKOTSocket(
    (newKot) => { setKots(prev => [...prev, newKot]); playChime(); },
    (update) => {
      setKots(prev => update.newStatus === 'served'
        ? prev.filter(k => k.id !== update.kotId)
        : prev.map(k => k.id === update.kotId ? { ...k, status: update.newStatus } : k)
      );
    }
  );

  const handleStatusUpdateLocally = (id, status) => {
    setKots(prev => status === 'served'
      ? prev.filter(k => k.id !== id)
      : prev.map(k => k.id === id ? { ...k, status } : k)
    );
  };

  const FILTERS = ['all', 'received', 'accepted', 'preparing', 'ready'];
  const COUNTS = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? kots.length : kots.filter(k => k.status === f).length;
    return acc;
  }, {});
  const visibleKots = filter === 'all' ? kots : kots.filter(k => k.status === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <ChefHat size={28} className="text-amber-500" />
            <div>
              <h1 className="text-2xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight leading-tight">
                Kitchen Display
              </h1>
              <p className="text-gray-600 text-xs uppercase tracking-widest">{kots.length} active KOTs</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                  filter === f
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                }`}
              >
                {f} {COUNTS[f] > 0 && <span className="ml-1 opacity-70">({COUNTS[f]})</span>}
              </button>
            ))}
            <a
              href="/kitchen/history"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/5 border border-white/10 text-gray-500 hover:text-amber-400 hover:border-amber-500/20 transition-all"
            >
              <History size={13} /> History
            </a>
          </div>
        </div>
      </div>

      {/* KOT Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
          <AnimatePresence>
            {visibleKots.map(kot => (
              <KOTCard key={kot.id} kot={kot} onStatusUpdate={handleStatusUpdateLocally} />
            ))}
          </AnimatePresence>
          {visibleKots.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-full py-24 text-center"
            >
              <ChefHat size={48} className="mx-auto mb-4 text-gray-800" strokeWidth={1} />
              <p className="text-gray-700 font-serif text-xl italic">Kitchen is clear</p>
              <p className="text-gray-800 text-sm uppercase tracking-widest mt-1">No active orders</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KOTBoard;
