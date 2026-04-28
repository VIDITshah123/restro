import { useState, useEffect } from 'react';
import { useKOTSocket } from '../../hooks/useSocket';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';

const KOTCard = ({ kot, onStatusUpdate }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(kot.generated_at).getTime();
    const updateElapsed = () => {
      const now = new Date().getTime();
      setElapsed(Math.floor((now - start) / 60000)); // in minutes
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [kot.generated_at]);

  const handleUpdate = async (status) => {
    try {
      await api.patch(`/kot/${kot.id}/status`, { status });
      onStatusUpdate(kot.id, status);
    } catch (err) {
      alert('Error updating status');
    }
  };

  const getBorderColor = () => {
    switch(kot.status) {
      case 'received': return 'border-l-gray-400';
      case 'accepted': return 'border-l-blue-400';
      case 'preparing': return 'border-l-orange-400';
      case 'ready': return 'border-l-green-400';
      default: return 'border-l-gray-200';
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-white rounded-lg shadow-md border border-gray-200 border-l-8 ${getBorderColor()} p-4 flex flex-col`}
    >
      <div className="flex justify-between items-start border-b pb-2 mb-2">
        <div>
          <h2 className="text-xl font-bold">{kot.kot_number}</h2>
          {/* Fix: socket emits tableNumber (camelCase), DB fetch returns table_number */}
          <p className="text-gray-600 font-semibold">{kot.table_number || kot.tableNumber || '—'}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm">{elapsed} min ago</p>
          <span className={`uppercase text-xs font-bold tracking-wider ${
            kot.status === 'ready' ? 'text-green-600' :
            kot.status === 'preparing' ? 'text-orange-500' :
            kot.status === 'accepted' ? 'text-blue-500' : 'text-gray-500'
          }`}>{kot.status}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {kot.items.map((item, idx) => (
          <div key={idx} className="flex gap-2 text-lg">
            <span className="font-bold">{item.quantity}x</span>
            <div>
              <p className="font-medium">{item.name}</p>
              {/* Show special notes only if non-empty */}
              {item.special_notes && item.special_notes.trim() !== '' && (
                <span className="inline-block mt-1 bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded font-bold">
                  📝 {item.special_notes}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-auto">
        {kot.status === 'received' && (
          <button onClick={() => handleUpdate('accepted')} className="flex-1 bg-blue-500 text-white font-bold py-2 rounded">✓ Accept</button>
        )}
        {kot.status === 'accepted' && (
          <button onClick={() => handleUpdate('preparing')} className="flex-1 bg-orange-500 text-white font-bold py-2 rounded">🍳 Preparing</button>
        )}
        {kot.status === 'preparing' && (
          <button onClick={() => handleUpdate('ready')} className="flex-1 bg-green-500 text-white font-bold py-2 rounded">🔔 Mark Ready</button>
        )}
        {kot.status === 'ready' && (
          <button
            onClick={() => handleUpdate('served')}
            className="flex-1 bg-purple-600 text-white font-bold py-2 rounded hover:bg-purple-700 transition-colors"
          >
            ✅ Mark Served
          </button>
        )}
      </div>
    </motion.div>
  );
};

const KOTBoard = () => {
  const [kots, setKots] = useState([]);

  useEffect(() => {
    const fetchKOTs = async () => {
      try {
        const res = await api.get('/kot');
        setKots(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchKOTs();
  }, []);

  const playChime = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  };

  useKOTSocket(
    (newKot) => {
      setKots(prev => [...prev, newKot]);
      playChime();
    },
    (update) => {
      setKots(prev => {
        if (update.newStatus === 'served') {
          return prev.filter(k => k.id !== update.kotId);
        }
        return prev.map(k => k.id === update.kotId ? { ...k, status: update.newStatus } : k);
      });
    }
  );

  const handleStatusUpdateLocally = (id, status) => {
    // The socket should ideally bounce this back, but optimistic update is good
    if (status === 'served') {
      setKots(prev => prev.filter(k => k.id !== id));
    } else {
      setKots(prev => prev.map(k => k.id === id ? { ...k, status } : k));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-gray-800">Kitchen Display System</h1>
        <div className="flex gap-4 items-center text-sm font-bold text-gray-500">
          <span>Active: {kots.length}</span>
          <a href="/kitchen/history" className="text-blue-500 underline">History</a>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
        <AnimatePresence>
          {kots.map(kot => (
            <KOTCard 
              key={kot.id} 
              kot={kot} 
              onStatusUpdate={handleStatusUpdateLocally} 
            />
          ))}
        </AnimatePresence>
        {kots.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold text-xl">
            No active orders. Kitchen is clear!
          </div>
        )}
      </div>
    </div>
  );
};

export default KOTBoard;
