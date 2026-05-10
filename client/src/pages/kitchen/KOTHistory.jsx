import { useState, useEffect } from 'react';
import api from '../../api';
import { toISTFull } from '../../lib/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, History } from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';

const selectClass = "bg-[#0f0f0f] border border-white/10 text-gray-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all";

const KOTHistory = () => {
  const [kots, setKots] = useState([]);
  const [sortOption, setSortOption] = useState('Newest First');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();

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
    const confirmed = await showConfirm('Clear ALL KOT history? This cannot be undone.', {
      title: 'Clear KOT History',
      danger: true,
      confirmLabel: 'Yes, Clear'
    });
    if (!confirmed) return;
    try {
      await api.delete('/kot/history/clear');
      const res = await api.get('/kot/history');
      setKots(res.data.data);
    } catch (err) { await showAlert('Error clearing history.', { title: 'Error', danger: true }); }
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
                <td className="px-6 py-4 text-sm text-gray-500 max-w-sm">
                  <div className="space-y-2">
                    {kot.items.map((item, i) => {
                      const isCombo = item.category === 'Combo Meals' || (item.description || '').includes('- ');
                      const subItems = isCombo
                        ? (item.description || '')
                            .split('\n')
                            .map(l => l.trim())
                            .filter(l => l.startsWith('- '))
                            .map(l => l.slice(2).trim())
                        : [];
                      return (
                        <div key={i} className={isCombo ? 'bg-amber-500/5 border border-amber-500/10 rounded-lg p-2' : ''}>
                          <div className="flex items-start gap-1.5">
                            <span className="text-amber-500/70 font-black text-xs mt-0.5">{item.quantity}×</span>
                            <div className="flex-1">
                              <span className="text-gray-300 font-medium">
                                {item.name}
                                {isCombo && <span className="ml-1.5 text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Combo</span>}
                              </span>
                              {item.special_notes?.trim() && (
                                <span className="ml-1.5 text-amber-400/50 italic text-xs">({item.special_notes})</span>
                              )}
                              {subItems.length > 0 && (
                                <div className="mt-1 space-y-0.5 pl-2 border-l border-amber-500/20">
                                  {subItems.map((sub, j) => (
                                    <p key={j} className="text-xs text-amber-400/60 leading-tight">
                                      <span className="text-amber-600 mr-1">›</span>{sub}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{toISTFull(kot.generated_at)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
      <AppDialog dialogState={dialogState} closeDialog={closeDialog} />
    </div>
  );
};

export default KOTHistory;
