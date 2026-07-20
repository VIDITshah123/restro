import React, { useEffect, useState, useRef } from 'react';
import api from '../../api';
import { Flag, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const ReportsPage = () => {
  const [activeReports, setActiveReports] = useState([]);
  const [historyReports, setHistoryReports] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const activeRes = await api.get('/reports/active');
      const historyRes = await api.get('/reports/history');
      setActiveReports(activeRes.data.data || []);
      setHistoryReports(historyRes.data.data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/admin`);
    socketRef.current = socket;

    socket.on('report:new', (report) => {
      setActiveReports(prev => {
        // Prevent duplicate local insertions
        if (prev.some(r => r.id === report.id)) return prev;
        return [report, ...prev];
      });
    });

    socket.on('report:resolved', (report) => {
      setActiveReports(prev => prev.filter(r => r.id !== report.id));
      setHistoryReports(prev => {
        if (prev.some(r => r.id === report.id)) return prev;
        return [report, ...prev];
      });
    });

    return () => socket.disconnect();
  }, []);

  const handleResolve = async (id) => {
    try {
      await api.patch(`/reports/${id}/resolve`);
      // Local state is updated via socket event
    } catch (err) {
      alert('Failed to resolve report. Please try again.');
    }
  };

  const getSortedReports = (reports) => {
    return [...reports].sort((a, b) => {
      const dateA = new Date(a.created_at || a.placed_at);
      const dateB = new Date(b.created_at || b.placed_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '< 1 min';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const toISTFull = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  };

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Customer Issue Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium uppercase tracking-widest">
            Real-time customer feedback & complaints
          </p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchReports}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Reports"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-[#0f0f0f] border border-white/10 text-gray-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-8">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-3 border-b-2 font-bold text-sm tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'active'
              ? 'border-amber-500 text-amber-500 bg-amber-500/5'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Active Issues
          {activeReports.length > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {activeReports.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 border-b-2 font-bold text-sm tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-amber-500 text-amber-500 bg-amber-500/5'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Resolution History
          {historyReports.length > 0 && (
            <span className="bg-white/10 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {historyReports.length}
            </span>
          )}
        </button>
      </div>

      {/* Reports Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + sortOrder}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'active' ? (
            activeReports.length === 0 ? (
              <div className="text-center py-20 bg-[#0f0f0f] border border-dashed border-white/5 rounded-2xl">
                <CheckCircle size={48} className="mx-auto text-green-500/30 mb-4" strokeWidth={1} />
                <p className="text-gray-500 text-lg font-serif italic">All customer reports resolved</p>
                <p className="text-gray-600 text-xs mt-1 uppercase tracking-widest">No active complaints pending</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSortedReports(activeReports).map((report) => (
                  <motion.div
                    key={report.id}
                    layout
                    whileHover={{ scale: 1.01 }}
                    className="bg-[#0f0f0f] border border-red-500/20 hover:border-red-500/40 rounded-2xl p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden"
                  >
                    {/* Glowing Accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 to-transparent"></div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest rounded">
                          {report.table_number || `Table ${report.table_id}`}
                        </span>
                        <h3 className="text-sm font-black text-white mt-3 uppercase tracking-wide">
                          {report.type === 'food' ? '🍽️ Food Complaint' : '⚠️ Other Issue'}
                        </h3>
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                        <Clock size={12} />
                        {toISTFull(report.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300 bg-white/5 p-4 rounded-xl border border-white/5 min-h-16 leading-relaxed font-medium italic">
                      "{report.description}"
                    </p>

                    {/* Food Items list */}
                    {report.type === 'food' && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block">
                          Affected Dishes
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            let items = [];
                            try {
                              items = JSON.parse(report.items);
                            } catch (e) {}
                            return items.map((item, idx) => (
                              <span key={idx} className="bg-red-950/40 text-red-400 border border-red-900/30 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                {item.name}
                                {item.issue && (
                                  <span className="text-[10px] text-amber-500 font-normal">({item.issue})</span>
                                )}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleResolve(report.id)}
                      className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-black py-3 rounded-xl transition-all uppercase tracking-widest cursor-pointer shadow-[0_4px_12px_rgba(220,38,38,0.2)] hover:scale-[1.02] active:scale-95 mt-auto"
                    >
                      Mark Resolved
                    </button>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            historyReports.length === 0 ? (
              <div className="text-center py-20 bg-[#0f0f0f] border border-dashed border-white/5 rounded-2xl">
                <AlertTriangle size={48} className="mx-auto text-gray-700 mb-4" strokeWidth={1} />
                <p className="text-gray-500 text-lg font-serif italic">No history available</p>
                <p className="text-gray-600 text-xs mt-1 uppercase tracking-widest">No complaints have been resolved yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSortedReports(historyReports).map((report) => (
                  <div
                    key={report.id}
                    className="bg-[#0f0f0f] border border-green-500/10 rounded-2xl p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden"
                  >
                    {/* Green accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-green-500 to-transparent"></div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase tracking-widest rounded">
                          {report.table_number || `Table ${report.table_id}`}
                        </span>
                        <h3 className="text-sm font-black text-white mt-3 uppercase tracking-wide">
                          {report.type === 'food' ? '🍽️ Food Complaint' : '⚠️ Other Issue'}
                        </h3>
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                        <Clock size={12} />
                        {toISTFull(report.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 bg-white/5 p-4 rounded-xl border border-white/5 min-h-16 leading-relaxed font-medium italic">
                      "{report.description}"
                    </p>

                    {/* Food Items list */}
                    {report.type === 'food' && (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            let items = [];
                            try {
                              items = JSON.parse(report.items);
                            } catch (e) {}
                            return items.map((item, idx) => (
                              <span key={idx} className="bg-white/5 text-gray-400 border border-white/5 text-xs px-2.5 py-1 rounded-lg font-semibold">
                                {item.name}
                                {item.issue && (
                                  <span className="text-[10px] text-gray-500 ml-1">({item.issue})</span>
                                )}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-white/5 pt-4 mt-auto flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
                      <div className="flex justify-between">
                        <span>Resolved At:</span>
                        <span className="text-gray-300">{toISTFull(report.resolved_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Resolution Time:</span>
                        <span className="text-green-500 font-black">{formatDuration(report.resolution_seconds)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ReportsPage;
