import { useState, useEffect } from 'react';
import api from '../../api';
import { toISTFull } from '../../lib/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, History } from 'lucide-react';

const selectClass = "bg-[#0f0f0f] border border-white/10 text-gray-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all";

const KOTHistory = () => {
  const [kots, setKots] = useState([]);
  const [sortOption, setSortOption] = useState('Newest First');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        let url = '/kot/history';
        const params = new URLSearchParams();
        if (dateRange.start) params.append('start', dateRange.start);
        if (dateRange.end) params.append('end', dateRange.end);
        if (params.toString()) url += `?${params.toString()}`;
        const res = await api.get(url);
        setKots(res.data.data);
      } catch (err) { console.error(err); }
    };
    fetchHistory();
  }, [dateRange]);

  const clearHistory = async () => {
    if (!confirm('Clear ALL KOT history? This cannot be undone.')) return;
    try {
      await api.delete('/kot/history/clear');
      const res = await api.get('/kot/history');
      setKots(res.data.data);
    } catch (err) { alert('Error clearing history'); }
  };

  const sortedKots = [...kots].sort((a, b) => {
    if (sortOption === 'Newest First') return new Date(b.generated_at) - new Date(a.generated_at);
    if (sortOption === 'Oldest First') return new Date(a.generated_at) - new Date(b.generated_at);
    if (sortOption === 'Table Name (A-Z)') return (a.table_number || '').localeCompare(b.table_number || '');
    if (sortOption === 'Table Name (Z-A)') return (b.table_number || '').localeCompare(a.table_number || '');
    if (sortOption === 'KOT Number (High to Low)') return parseInt(b.kot_number.replace('KOT-', '')) - parseInt(a.kot_number.replace('KOT-', ''));
    if (sortOption === 'KOT Number (Low to High)') return parseInt(a.kot_number.replace('KOT-', '')) - parseInt(b.kot_number.replace('KOT-', ''));
    return 0;
  });

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            KOT History
          </h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">{sortedKots.length} records</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range */}
          <div className="flex items-center gap-2 bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5">
            <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="text-sm bg-transparent text-gray-300 outline-none" />
            <span className="text-gray-600 text-xs">to</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="text-sm bg-transparent text-gray-300 outline-none" />
          </div>
          <select value={sortOption} onChange={e => setSortOption(e.target.value)} className={selectClass}>
            <option>Newest First</option>
            <option>Oldest First</option>
            <option>Table Name (A-Z)</option>
            <option>Table Name (Z-A)</option>
            <option>KOT Number (High to Low)</option>
            <option>KOT Number (Low to High)</option>
          </select>
          <button onClick={clearHistory} className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-4 py-2.5 rounded-xl font-medium text-sm transition-all uppercase tracking-wider">
            <Trash2 size={14} /> Clear History
          </button>
          <a href="/kitchen" className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 hover:text-amber-400 hover:border-amber-500/20 px-4 py-2.5 rounded-xl font-medium text-sm transition-all uppercase tracking-wider">
            <ArrowLeft size={14} /> Back to KDS
          </a>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              {['KOT Number', 'Table', 'Items', 'Time'].map(h => (
                <th key={h} className="px-6 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedKots.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <History size={36} className="mx-auto mb-3 text-gray-700" strokeWidth={1} />
                  <p className="text-gray-600 text-sm uppercase tracking-widest">No history available</p>
                </td>
              </tr>
            )}
            {sortedKots.map((kot, idx) => (
              <motion.tr
                key={kot.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4">
                  <span className="font-black text-amber-500 font-mono text-sm">{kot.kot_number}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300 font-medium">{kot.table_number}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                  {kot.items.map((item, i) => (
                    <span key={i}>
                      <span className="text-amber-500/70 font-bold">{item.quantity}x</span> {item.name}
                      {item.special_notes?.trim() ? <span className="text-amber-500/50 italic"> ({item.special_notes})</span> : ''}
                      {i < kot.items.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{toISTFull(kot.generated_at)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default KOTHistory;
