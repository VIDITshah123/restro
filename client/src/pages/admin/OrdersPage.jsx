import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import api from '../../api';
import { toISTFull } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Download, Trash2, X, FileText, Printer, Plus,
  ChevronDown, ChevronRight, ShoppingBag, Bike, Utensils, Globe, Clock
} from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';
import ThermalReceipt from '../../components/admin/ThermalReceipt';
import PlaceOrderModal from '../../components/admin/PlaceOrderModal';
import { io } from 'socket.io-client';

const STATUS_COLORS = {
  placed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preparing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  served: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  billed: 'bg-white/5 text-gray-500 border-white/10',
  active: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
};

const thClass = "px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold cursor-pointer hover:text-amber-400 transition-colors select-none";
const tdClass = "px-5 py-4";

const SimpleTableHead = ({ cols }) => (
  <thead>
    <tr className="border-b border-white/5">
      {cols.map(c => <th key={c} className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">{c}</th>)}
    </tr>
  </thead>
);

const AmberValue = ({ v }) => <span className="font-black text-amber-500">₹{v}</span>;

  // Modal for viewing complete session bill details & printing receipt
  const SessionDetailModal = ({ session, onClose }) => {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-[#0f0f0f] border border-amber-500/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] max-w-xl w-full max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
            <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex justify-between items-start z-10">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-serif font-black text-gray-100">{session.tableNumber}</h2>
                  {session.orderType === 'takeaway' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Takeaway
                    </span>
                  )}
                  {session.orderType === 'delivery' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      Free Delivery
                    </span>
                  )}
                </div>
                <p className="text-amber-500/80 text-xs mt-1 uppercase tracking-widest">
                  Session contains {session.orderCount} order(s): {session.orderNumbers?.map(n => `#${n}`).join(', ') || session.orderIds?.map(i => `#${i}`).join(', ')}
                </p>
                {session.onlinePlatform && (
                  <p className="text-blue-400 text-xs mt-0.5 flex items-center gap-1">
                    <Globe size={11} /> {session.onlinePlatform}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="text-gray-400 hover:text-gray-200 bg-white/5 rounded-full p-2 transition-colors cursor-pointer"
                    title="Print Receipt"
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    onClick={onClose}
                    className="text-gray-600 hover:text-gray-300 bg-white/5 rounded-full p-2 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
              </div>
            </div>

                      <div className="p-6 space-y-6">
                        {/* Customer info if any */}
                        {(session.customerName || session.customerPhone || session.customerAddress) && (
                          <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 text-xs space-y-1">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Customer Details</span>
                            {session.customerName && <p className="text-gray-200 font-bold">{session.customerName}</p>}
                            {session.customerPhone && <p className="text-gray-400">📞 {session.customerPhone}</p>}
                            {session.customerAddress && <p className="text-gray-400">📍 {session.customerAddress}</p>}
                          </div>
                        )}

                        {/* Consolidated Items */}
                        <div>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                            All Items In Session ({session.items?.length || 0})
                          </h3>
                          <div className="space-y-2.5">
                            {session.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start border-b border-white/5 pb-2.5 last:border-0">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-200 text-sm">
                                    <span className="text-amber-500 font-mono">{item.quantity}×</span> {item.name}
                                  </p>
                                  {item.special_notes?.trim() && (
                      <p className="text-xs text-amber-500/60 font-medium mt-0.5">📝 {item.special_notes}</p>
                                  )}
                                </div>
                                <span className="font-black text-gray-300 font-mono text-sm ml-4">₹{item.total || item.price * item.quantity}</span>
                              </div>
                            ))}
                            </div>
                          </div>

                          {/* Individual Orders Breakdown */}
                          {session.orders?.length > 1 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Order-by-Order Breakdown
                              </h3>
                              <div className="space-y-3">
                                {session.orders.map((ord, ordIdx) => (
                                  <div key={ord.id} className="bg-[#141414] border border-white/5 rounded-2xl p-3.5 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-black text-amber-500">
                                        Round {ordIdx + 1} — Order #{ord.order_number || ord.id}
                                      </span>
                                      <span className="text-gray-500">{toISTFull(ord.placed_at)}</span>
                                    </div>
                                    <div className="space-y-1 pl-2 border-l border-white/10 text-xs text-gray-300">
                                      {ord.items?.map(it => (
                                        <div key={it.id} className="flex justify-between">
                                          <span>{it.quantity}× {it.name}</span>
                                          <span className="font-mono">₹{it.price * it.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="text-right text-xs font-bold text-gray-400 pt-1 border-t border-white/5">
                                      Subtotal: <span className="text-amber-400 font-mono">₹{ord.total_amount}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
          )}

                          {/* Session Total Bar */}
                          <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                            <div>
                              <span className="text-xs text-gray-500 uppercase tracking-wider block">Total Session Bill</span>
                              <span className="text-xs text-gray-400">Paid via: <strong className="text-gray-200">{session.paymentMethod}</strong></span>
                            </div>
                            <span className="text-3xl font-black text-amber-500 font-mono">₹{session.totalAmount}</span>
                          </div>
                        </div>

                        {/* Hidden Thermal Receipt component for printing */}
                        <ThermalReceipt
                          tableNumber={session.tableNumber}
                          orders={session.orders}
                          grandTotal={session.totalAmount}
                          paymentMethod={session.paymentMethod || 'Cash'}
                          orderType={session.orderType}
                          onlinePlatform={session.onlinePlatform}
                          customerName={session.customerName}
                          customerPhone={session.customerPhone}
                          customerAddress={session.customerAddress}
                        />
                      </motion.div>
                    </motion.div>
                  );
};

const OrdersPage = () => {
  const [sessions, setSessions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  // Default is Session Wise as requested!
                  const [reportType, setReportType] = useState('Session Wise');
                  const [dishReport, setDishReport] = useState([]);
                  const [sortConfig, setSortConfig] = useState({key: 'placed_at', direction: 'desc' });
                  const [dateRange, setDateRange] = useState({start: '', end: '' });

                  const [isPlaceOrderOpen, setIsPlaceOrderOpen] = useState(false);
                  const [expandedSessionKeys, setExpandedSessionKeys] = useState(new Set());

                  const {showAlert, showConfirm, dialogState, closeDialog} = useDialog();
                  const socketRef = useRef(null);

  const toggleExpandSession = (key) => {
                    setExpandedSessionKeys(prev => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
  };

  const fetchData = async () => {
    try {
      const [sessRes, ordRes] = await Promise.all([
                  api.get('/orders/sessions'),
                  api.get('/orders')
                  ]);
                  setSessions(sessRes.data.data || []);
                  setOrders(ordRes.data.data || []);
    } catch (err) {
                    console.error('Failed to fetch orders / sessions:', err);
    }
  };

  useEffect(() => {
                    fetchData();

                  const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                  const socket = io(`${SOCKET_URL}/admin`);
                  socketRef.current = socket;

    socket.on('kot:new', () => fetchData());
    socket.on('order:billed', () => fetchData());
    socket.on('table:statusChanged', () => fetchData());

                  const interval = setInterval(fetchData, 25000);
    return () => {
                    clearInterval(interval);
                  socket.disconnect();
    };
  }, []);

  const handleSort = (key) => {
                    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredAndSortedSessions = useMemo(() => {
                    let result = [...sessions];
    if (dateRange.start) result = result.filter(s => new Date(s.firstPlacedAt) >= new Date(dateRange.start));
                  if (dateRange.end) {
      const end = new Date(dateRange.end); end.setDate(end.getDate() + 1);
      result = result.filter(s => new Date(s.firstPlacedAt) < end);
    }
    result.sort((a, b) => {
      const aVal = sortConfig.key === 'total_amount' ? a.totalAmount : a.firstPlacedAt;
                  const bVal = sortConfig.key === 'total_amount' ? b.totalAmount : b.firstPlacedAt;
                  if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                  return 0;
    });
                  return result;
  }, [sessions, sortConfig, dateRange]);

  const filteredAndSortedOrders = useMemo(() => {
                    let result = [...orders];
    if (dateRange.start) result = result.filter(o => new Date(o.placed_at) >= new Date(dateRange.start));
                  if (dateRange.end) {
      const end = new Date(dateRange.end); end.setDate(end.getDate() + 1);
      result = result.filter(o => new Date(o.placed_at) < end);
    }
    result.sort((a, b) => {
                    let aVal = a[sortConfig.key];
                  let bVal = b[sortConfig.key];
                  if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                  return 0;
    });
                  return result;
  }, [orders, sortConfig, dateRange]);

  useEffect(() => {
    if (reportType === 'Dish Wise') {
                    let url = '/analytics/top-dishes?limit=1000';
                  if (dateRange.start) url += `&start=${dateRange.start}`;
                  if (dateRange.end) url += `&end=${dateRange.end}`;
      api.get(url).then(res => setDishReport(res.data.data)).catch(console.error);
    }
  }, [reportType, dateRange]);

  const clearHistory = async () => {
                  const confirmed = await showConfirm(
                  'Clear ALL billed order history? This cannot be undone.',
                  {title: 'Clear History', danger: true, confirmLabel: 'Yes, Clear' }
                  );
                  if (!confirmed) return;
                  try {
                    await api.delete('/orders/history/clear');
                    fetchData();
                  } catch {
                    await showAlert('Error clearing history.', { title: 'Error', danger: true });
                  }
  };

  const getTableReport = () => {
    const data = filteredAndSortedSessions.reduce((acc, s) => {
      const t = s.tableNumber || `Table ${s.tableId}`;
                  if (!acc[t]) acc[t] = {sessions: 0, orders: 0, revenue: 0 };
                  acc[t].sessions++;
                  acc[t].orders += s.orderCount;
                  acc[t].revenue += s.totalAmount;
                  return acc;
    }, { });
    return Object.entries(data).map(([name, val]) => ({name, ...val })).sort((a, b) => b.revenue - a.revenue);
  };

  const getPaymentReport = () => {
    const data = filteredAndSortedSessions.reduce((acc, s) => {
      const p = s.paymentMethod || 'Unpaid';
                  if (!acc[p]) acc[p] = {sessions: 0, revenue: 0 };
                  acc[p].sessions++;
                  acc[p].revenue += s.totalAmount;
                  return acc;
    }, { });
    return Object.entries(data).map(([name, val]) => ({name, ...val })).sort((a, b) => b.revenue - a.revenue);
  };

  const getTimeReport = () => {
    const data = filteredAndSortedSessions.reduce((acc, s) => {
      const hour = new Date(s.firstPlacedAt).getHours();
                  const timeStr = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;
                  if (!acc[timeStr]) acc[timeStr] = {sessions: 0, revenue: 0, hour };
                  acc[timeStr].sessions++;
                  acc[timeStr].revenue += s.totalAmount;
                  return acc;
    }, { });
    return Object.values(data).sort((a, b) => a.hour - b.hour);
  };

  const handleExport = () => {
                    let dataToExport = [];
                  if (reportType === 'Session Wise') {
                    dataToExport = filteredAndSortedSessions.map(s => ({
                      SessionID: s.sessionId,
                      TableOrChannel: s.tableNumber,
                      OrderType: s.orderType,
                      OnlinePlatform: s.onlinePlatform || 'N/A',
                      OrdersCount: s.orderCount,
                      OrderNumbers: s.orderNumbers?.map(n => `#${n}`).join(', ') || s.orderIds?.join(', '),
                      TotalAmount: s.totalAmount,
                      Payment: s.paymentMethod,
                      Status: s.status,
                      PlacedAt: toISTFull(s.firstPlacedAt),
                      CompletedAt: toISTFull(s.lastUpdatedAt)
                    }));
    } else if (reportType === 'Order Wise') {
                    dataToExport = filteredAndSortedOrders.map(o => ({
                      OrderID: o.id,
                      OrderNumber: o.order_number,
                      TableOrChannel: o.table_number,
                      OrderType: o.order_type,
                      OnlinePlatform: o.online_platform || 'N/A',
                      Total: o.total_amount,
                      Payment: o.payment_method || 'Unpaid',
                      Status: o.status,
                      Time: toISTFull(o.placed_at)
                    }));
    } else if (reportType === 'Table Wise') {
                    dataToExport = getTableReport().map(r => ({
                      Channel: r.name,
                      TotalSessions: r.sessions,
                      TotalOrders: r.orders,
                      Revenue: r.revenue
                    }));
    } else if (reportType === 'Dish Wise') {
                    dataToExport = dishReport.map(r => ({
                      Dish: r.name,
                      QuantitySold: r.total_sold,
                      Revenue: r.revenue
                    }));
    } else if (reportType === 'Payment Wise') {
                    dataToExport = getPaymentReport().map(r => ({
                      PaymentMethod: r.name,
                      TotalSessions: r.sessions,
                      Revenue: r.revenue
                    }));
    } else if (reportType === 'Time Wise') {
                    dataToExport = getTimeReport().map(r => ({
                      TimeSlot: `${String(r.hour).padStart(2, '0')}:00`,
                      Sessions: r.sessions,
                      Revenue: r.revenue
                    }));
    }

                  const ws = XLSX.utils.json_to_sheet(dataToExport);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Report');
                  XLSX.writeFile(wb, `${reportType.replace(/\s+/g, '_')}_Report.xlsx`);
  };

                  const selectClass = "bg-[#0f0f0f] border border-white/10 text-gray-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all";

                  return (
                  <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8 flex-wrap gap-4">
                      <div>
                        <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
                          Orders & Reports
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">
                          {reportType === 'Session Wise' ? `${filteredAndSortedSessions.length} sessions grouped` : `${filteredAndSortedOrders.length} orders shown`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {/* New Order Button */}
                        <button
                          onClick={() => setIsPlaceOrderOpen(true)}
                          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black px-4 py-2.5 rounded-xl font-black text-sm transition-all uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] cursor-pointer"
                        >
                          <Plus size={16} strokeWidth={2.5} /> Place Order
                        </button>

                        <div className="flex items-center gap-2 bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5">
                          <input
                            type="date"
                            value={dateRange.start}
                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                            className="text-sm bg-transparent text-gray-300 outline-none"
                          />
                          <span className="text-gray-600 text-xs">to</span>
                          <input
                            type="date"
                            value={dateRange.end}
                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                            className="text-sm bg-transparent text-gray-300 outline-none"
                          />
                        </div>

                          <select
                            value={reportType}
                            onChange={e => setReportType(e.target.value)}
                            className={selectClass}
                          >
                            {['Session Wise', 'Order Wise', 'Table Wise', 'Dish Wise', 'Payment Wise', 'Time Wise'].map(o => (
                              <option key={o} value={o}>
                                {o === 'Session Wise' ? 'Session Wise (Grouped)' : o}
                              </option>
                            ))}
                          </select>

                            <button
                              onClick={handleExport}
                              className="flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-4 py-2.5 rounded-xl font-bold text-sm transition-all uppercase tracking-wider cursor-pointer"
                            >
                              <Download size={14} /> Export
                            </button>

                              <button
                                onClick={clearHistory}
                                className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-4 py-2.5 rounded-xl font-medium text-sm transition-all uppercase tracking-wider cursor-pointer"
                              >
                                <Trash2 size={14} /> Clear Billed
                              </button>
                            </div>
                          </motion.div>

                            {/* Main Table Container */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">

                              {/* 1. SESSION WISE VIEW (Primary Grouped View) */}
                              {reportType === 'Session Wise' && (
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b border-white/5">
                                      <th className="w-10 px-4 py-4"></th>
                                      <th className={thClass} onClick={() => handleSort('tableNumber')}>Table / Channel</th>
                                      <th className={thClass}>Orders in Session</th>
                                      <th className={thClass}>Items Preview</th>
                                      <th className={thClass} onClick={() => handleSort('total_amount')}>Total Bill</th>
                                      <th className={thClass}>Payment</th>
                                      <th className={thClass}>Status</th>
                                      <th className={thClass} onClick={() => handleSort('firstPlacedAt')}>Session Timing</th>
                                      <th className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold text-right">Receipt</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {filteredAndSortedSessions.length === 0 ? (
                                      <tr>
                                        <td colSpan="9" className="px-5 py-16 text-center text-gray-600 text-sm">
                                          <FileText size={36} className="mx-auto mb-3 text-gray-700" strokeWidth={1} />
                                          <p className="uppercase tracking-widest font-medium">No sessions found</p>
                                        </td>
                                      </tr>
                                    ) : (
                                      filteredAndSortedSessions.map(session => {
                                        const isExpanded = expandedSessionKeys.has(session.sessionId);
                                        const orderNumsStr = session.orderNumbers?.length > 0
                                          ? session.orderNumbers.map(n => `#${n}`).join(', ')
                                          : session.orderIds.map(i => `#${i}`).join(', ');

                                        return (
                                          <Fragment key={session.sessionId}>
                                            <tr className="hover:bg-white/[0.02] transition-colors group">
                                              {/* Expand/Collapse Toggle */}
                                              <td className="px-4 py-4 text-center">
                                                <button
                                                  onClick={() => toggleExpandSession(session.sessionId)}
                                                  className="text-gray-500 hover:text-amber-400 transition-colors cursor-pointer"
                                                >
                                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                </button>
                                              </td>

                                              {/* Table / Channel */}
                                              <td className={tdClass}>
                                                <div className="flex flex-col gap-1 items-start">
                                                  <span className="font-bold text-base text-gray-100 flex items-center gap-1.5">
                                                    {session.orderType === 'takeaway' && <ShoppingBag size={15} className="text-purple-400" />}
                                                    {session.orderType === 'delivery' && <Bike size={15} className="text-orange-400" />}
                                                    {session.orderType === 'dine_in' && <Utensils size={15} className="text-amber-400" />}
                                                    {session.tableNumber}
                                                  </span>
                                                  {session.onlinePlatform && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                      <Globe size={10} /> {session.onlinePlatform}
                                                    </span>
                                                  )}
                                                  {session.customerName && (
                                                    <span className="text-[11px] text-gray-500">
                                                      {session.customerName}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>

                                              {/* Orders in Session */}
                                              <td className={tdClass}>
                                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
                                                  {orderNumsStr}
                                                </span>
                                                <span className="text-[11px] text-gray-500 block mt-1">
                                                  {session.orderCount} order round{session.orderCount > 1 ? 's' : ''}
                                                </span>
                                              </td>

                                              {/* Items preview */}
                                              <td className={`${tdClass} max-w-xs truncate text-xs text-gray-400`}>
                                                {session.items?.slice(0, 3).map((it, idx) => (
                                                  <span key={idx} className="mr-2">
                                                    <strong className="text-gray-200">{it.quantity}×</strong> {it.name}
                                                  </span>
                                                ))}
                                                {session.items?.length > 3 && (
                                                  <span className="text-amber-500 font-bold">+{session.items.length - 3} more</span>
                                                )}
                                              </td>

                                              {/* Total Bill */}
                                              <td className={tdClass}>
                                                <span className="font-black text-amber-500 font-mono text-base">₹{session.totalAmount}</span>
                                              </td>

                                              {/* Payment */}
                                              <td className={`${tdClass} text-gray-400 text-xs font-semibold`}>
                                                {session.paymentMethod || '—'}
                                              </td>

                                              {/* Status */}
                                              <td className={tdClass}>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${session.status === 'billed'
                                                    ? 'bg-white/5 text-gray-400 border-white/10'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                                                  }`}>
                                                  {session.status === 'billed' ? 'Billed' : 'Active Session'}
                                                </span>
                                              </td>

                                              {/* Timing */}
                                              <td className={`${tdClass} text-xs text-gray-500 whitespace-nowrap`}>
                                                <div>{toISTFull(session.firstPlacedAt)}</div>
                                                {session.lastUpdatedAt && session.lastUpdatedAt !== session.firstPlacedAt && (
                                                  <div className="text-[10px] text-gray-600">to {toISTFull(session.lastUpdatedAt)}</div>
                                                )}
                                              </td>

                                              {/* Receipt Button */}
                                              <td className={`${tdClass} text-right`}>
                                                <button
                                                  onClick={() => setSelectedSession(session)}
                                                  className="px-3 py-1.5 bg-white/5 hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 border border-white/10 hover:border-amber-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                                >
                                                  <Printer size={13} /> View / Print
                                                </button>
                                              </td>
                                            </tr>

                                            {/* Expanded Accordion: Breakdown of individual orders inside this session */}
                                            {isExpanded && (
                                              <tr className="bg-white/[0.015]">
                                                <td colSpan="9" className="px-8 py-4 border-y border-white/5">
                                                  <div className="space-y-3">
                                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block">
                                                      Individual Orders Inside This Session ({session.orders?.length || 0})
                                                    </span>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                      {session.orders?.map(ord => (
                                                        <div key={ord.id} className="bg-[#141414] border border-white/5 rounded-xl p-3.5 space-y-2">
                                                          <div className="flex justify-between items-center text-xs">
                                                            <span className="font-bold text-gray-200">
                                                              Order #{ord.order_number || ord.id}
                                                            </span>
                                                            <span className="font-mono text-amber-500 font-bold">₹{ord.total_amount}</span>
                                                          </div>
                                                          <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                                            <Clock size={11} /> {toISTFull(ord.placed_at)}
                                                          </div>
                                                          <div className="space-y-1 pt-1.5 border-t border-white/5 text-xs text-gray-300">
                                                            {ord.items?.map(it => (
                                                              <div key={it.id} className="flex justify-between">
                                                                <span className="truncate pr-2">{it.quantity}× {it.name}</span>
                                                                <span className="text-gray-500 font-mono">₹{it.price * it.quantity}</span>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </Fragment>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              )}

                              {/* 2. ORDER WISE VIEW (Raw un-grouped orders) */}
                              {reportType === 'Order Wise' && (
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b border-white/5">
                                        {
                                          [['Order #', 'id'], ['Table / Channel', 'table_number'], ['Total', 'total_amount'], ['Payment', 'payment_method'], ['Status', 'status'], ['Time', 'placed_at']].map(([l, k]) => (
                                            <th key={k} className={thClass} onClick={() => handleSort(k)}>
                                              {l} {sortConfig.key === k ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                            </th>
                                          ))
                                        }
              </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
              {filteredAndSortedOrders.length === 0 ? (
                                      <tr><td colSpan="6" className="px-5 py-14 text-center text-gray-600 text-sm">No orders yet</td></tr>
                                    ) : (
                                      filteredAndSortedOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                                          <td className={tdClass}>
                                            <span className="font-black text-gray-200">#{order.order_number ? String(order.order_number).padStart(2, '0') : order.id}</span>
                                            <span className="text-xs text-gray-600 ml-1.5">(ID:{order.id})</span>
                                          </td>
                                          <td className={tdClass}>
                                            <div className="flex flex-col gap-0.5 items-start">
                                              <span className="font-bold text-gray-200">
                                                {order.table_number || `Table ${order.table_id}`}
                                              </span>
                                              {order.online_platform && (
                                                <span className="text-[10px] text-blue-400 flex items-center gap-1">
                                                  <Globe size={10} /> {order.online_platform}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className={tdClass}><span className="font-black text-amber-500">₹{order.total_amount}</span></td>
                                          <td className={`${tdClass} text-gray-500`}>{order.payment_method || '—'}</td>
                                          <td className={tdClass}>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${STATUS_COLORS[order.status] || 'bg-white/5 text-gray-500 border-white/10'}`}>
                                              {order.status}
                                            </span>
                                          </td>
                                          <td className={`${tdClass} text-xs text-gray-600 whitespace-nowrap`}>{toISTFull(order.placed_at)}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              )}

                              {/* 3. TABLE WISE */}
                              {reportType === 'Table Wise' && (
                                <table className="w-full text-left">
                                  <SimpleTableHead cols={['Table / Channel', 'Total Sessions', 'Total Orders', 'Total Revenue']} />
                                  <tbody className="divide-y divide-white/5">
                                    {getTableReport().map(row => (
                                      <tr key={row.name} className="hover:bg-white/[0.02] transition-colors">
                                        <td className={`${tdClass} font-bold text-gray-200`}>{row.name}</td>
                                        <td className={`${tdClass} text-gray-400`}>{row.sessions}</td>
                                        <td className={`${tdClass} text-gray-400`}>{row.orders}</td>
                                        <td className={tdClass}><AmberValue v={row.revenue.toFixed(2)} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* 4. PAYMENT WISE */}
                              {reportType === 'Payment Wise' && (
                                <table className="w-full text-left">
                                  <SimpleTableHead cols={['Payment Method', 'Total Sessions', 'Total Revenue']} />
                                  <tbody className="divide-y divide-white/5">
                                    {getPaymentReport().map(row => (
                                      <tr key={row.name} className="hover:bg-white/[0.02] transition-colors">
                                        <td className={`${tdClass} font-bold text-gray-200`}>{row.name}</td>
                                        <td className={`${tdClass} text-gray-400`}>{row.sessions}</td>
                                        <td className={tdClass}><AmberValue v={row.revenue.toFixed(2)} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* 5. TIME WISE */}
                              {reportType === 'Time Wise' && (
                                <table className="w-full text-left">
                                  <SimpleTableHead cols={['Time Slot', 'Total Sessions', 'Total Revenue']} />
                                  <tbody className="divide-y divide-white/5">
                                    {getTimeReport().map(row => (
                                      <tr key={row.hour} className="hover:bg-white/[0.02] transition-colors">
                                        <td className={`${tdClass} font-bold text-gray-200`}>{`${String(row.hour).padStart(2, '0')}:00 — ${String(row.hour + 1).padStart(2, '0')}:00`}</td>
                                        <td className={`${tdClass} text-gray-400`}>{row.sessions}</td>
                                        <td className={tdClass}><AmberValue v={row.revenue.toFixed(2)} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* 6. DISH WISE */}
                              {reportType === 'Dish Wise' && (
                                <table className="w-full text-left">
                                  <SimpleTableHead cols={['Dish Name', 'Total Sold']} />
                                  <tbody className="divide-y divide-white/5">
                                    {dishReport.map(row => (
                                      <tr key={row.name} className="hover:bg-white/[0.02] transition-colors">
                                        <td className={`${tdClass} font-bold text-gray-200`}>{row.name}</td>
                                        <td className={`${tdClass} text-amber-500 font-black`}>{row.total_sold} units</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                            </motion.div>

                            {/* Session Detail Modal */}
                            <AnimatePresence>
                              {selectedSession && (
                                <SessionDetailModal
                                  session={selectedSession}
                                  onClose={() => setSelectedSession(null)}
                                />
                              )}
                            </AnimatePresence>

                            {/* Place Order Modal */}
                            <PlaceOrderModal
                              isOpen={isPlaceOrderOpen}
                              onClose={() => setIsPlaceOrderOpen(false)}
                              onOrderPlaced={() => fetchData()}
                            />

                            <AppDialog dialogState={dialogState} closeDialog={closeDialog} />
                          </div>
                          );
};

                          export default OrdersPage;
