import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, RefreshCw, Calendar, ChevronDown, Inbox } from 'lucide-react';
import api from '../../api';

const RoleBadge = ({ role }) => {
  if (role === 'admin') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
        Admin
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
      {role || 'Waiter'}
    </span>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch {
    return dateStr;
  }
};

const CancellationLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');

  // Derived filter options
  const tableOptions = [...new Set(logs.map(l => l.table_number).filter(Boolean))].sort();
  const staffOptions = [...new Set(logs.map(l => l.cancelled_by_name).filter(Boolean))].sort();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/cancellations');
      setLogs(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load cancellations:', err);
      setError('Failed to load cancellation log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (tableFilter && log.table_number !== tableFilter) return false;
    if (staffFilter && log.cancelled_by_name !== staffFilter) return false;
    if (startDate) {
      const logDate = new Date(log.cancelled_at).toISOString().slice(0, 10);
      if (logDate < startDate) return false;
    }
    if (endDate) {
      const logDate = new Date(log.cancelled_at).toISOString().slice(0, 10);
      if (logDate > endDate) return false;
    }
    return true;
  });

  return (
    <div className="min-h-full bg-[#0a0a0a] p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-black text-white">Cancellation Log</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Item cancellation audit trail</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Start Date */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-[#161616] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50 [color-scheme:dark]"
            placeholder="Start date"
          />
        </div>

        {/* End Date */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full bg-[#161616] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50 [color-scheme:dark]"
            placeholder="End date"
          />
        </div>

        {/* Table Filter */}
        <div className="relative">
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value)}
            className="w-full appearance-none bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50"
          >
            <option value="">All Tables</option>
            {tableOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Staff Filter */}
        <div className="relative">
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="w-full appearance-none bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50"
          >
            <option value="">All Staff</option>
            {staffOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-500 animate-pulse text-sm">
            Loading cancellations...
          </div>
        ) : filteredLogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-24 flex flex-col items-center gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Inbox size={28} className="text-gray-600" />
            </div>
            <div>
              <p className="text-gray-400 font-semibold">No cancellations found</p>
              <p className="text-gray-600 text-sm mt-1">Try adjusting your filters or check back later.</p>
            </div>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-[#0c0c0c]">
                  {['Timestamp', 'Table', 'Order #', 'Item Name', 'Qty', 'Reason', 'Cancelled By'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredLogs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap font-mono text-xs">
                        {formatDate(log.cancelled_at)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-200 font-semibold whitespace-nowrap">
                        {log.table_number || <span className="text-gray-600 italic">N/A</span>}
                      </td>
                      <td className="px-5 py-3.5 text-amber-500 font-mono font-bold whitespace-nowrap">
                        #{log.order_id}
                      </td>
                      <td className="px-5 py-3.5 text-gray-200 max-w-[200px] truncate">
                        {log.menu_item_name}
                      </td>
                      <td className="px-5 py-3.5 text-gray-300 font-mono text-center">
                        {log.quantity}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 max-w-[180px] truncate">
                        {log.reason}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 font-medium">{log.cancelled_by_name}</span>
                          <RoleBadge role={log.cancelled_by_role} />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && filteredLogs.length > 0 && (
        <p className="text-xs text-gray-600 text-right">
          Showing {filteredLogs.length} of {logs.length} cancellations
        </p>
      )}
    </div>
  );
};

export default CancellationLogPage;
