import React, { useState, useEffect } from 'react';
import api from '../../api';
import { toISTFull } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Download, Trash2, X, FileText } from 'lucide-react';
import useDialog from '../../hooks/useDialog';

const STATUS_COLORS = {
  placed:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preparing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ready:     'bg-green-500/10 text-green-400 border-green-500/20',
  served:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  billed:    'bg-white/5 text-gray-500 border-white/10',
};

const thClass = "px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold cursor-pointer hover:text-amber-400 transition-colors select-none";
const tdClass = "px-5 py-4";

const tableHead = (label, key, sortConfig, handleSort) => (
  <th className={thClass} onClick={() => handleSort(key)}>
    {label} {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
  </th>
);

const SimpleTableHead = ({ cols }) => (
  <thead>
    <tr className="border-b border-white/5">
      {cols.map(c => <th key={c} className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">{c}</th>)}
    </tr>
  </thead>
);

const AmberValue = ({ v }) => <span className="font-black text-amber-500">₹{v}</span>;

const OrderDetailModal = ({ order, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${order.id}`)
      .then(res => setDetails(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [order.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-serif font-black text-gray-100">Order #{order.id}</h2>
            <p className="text-amber-500/60 text-xs mt-1 uppercase tracking-widest">{order.table_number} · {order.customer_name || 'Guest'}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 bg-white/5 rounded-full p-1.5 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-gray-600 text-center py-8 animate-pulse uppercase tracking-widest text-sm">Loading…</p>
          ) : details?.items ? (
            <div className="space-y-3">
              {details.items.map(item => (
                <div key={item.id} className="flex justify-between items-start border-b border-white/5 pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-bold text-gray-200"><span className="text-amber-500">{item.quantity}x</span> {item.name}</p>
                    {item.special_notes?.trim() && (
                      <p className="text-xs text-amber-500/60 font-medium mt-1">📝 {item.special_notes}</p>
                    )}
                  </div>
                  <span className="font-black text-gray-300 ml-4">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-4 mt-2 flex justify-between items-center">
                <span className="font-serif text-gray-400 tracking-wider">Total</span>
                <span className="text-2xl font-black text-amber-500">₹{details.total_amount}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No details available</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reportType, setReportType] = useState('Order Wise');
  const [dishReport, setDishReport] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'placed_at', direction: 'desc' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const { show, DialogUI } = useDialog();

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredAndSortedOrders = React.useMemo(() => {
    let result = [...orders];
    if (dateRange.start) result = result.filter(o => new Date(o.placed_at) >= new Date(dateRange.start));
    if (dateRange.end) {
      const end = new Date(dateRange.end); end.setDate(end.getDate() + 1);
      result = result.filter(o => new Date(o.placed_at) < end);
    }
    result.sort((a, b) => {
      let aVal = sortConfig.key === 'customer_name' ? (a.customer_name || 'Guest').toLowerCase() : a[sortConfig.key];
      let bVal = sortConfig.key === 'customer_name' ? (b.customer_name || 'Guest').toLowerCase() : b[sortConfig.key];
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

  useEffect(() => {
    const fetchOrders = async () => {
      try { const res = await api.get('/orders'); setOrders(res.data.data); } catch (err) { console.error(err); }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const clearHistory = () => {
    show({
      type: 'confirm',
      title: 'Clear Billed History?',
      message: 'This will permanently remove all billed order records. This cannot be undone.',
      confirmLabel: 'Clear History',
      onConfirm: async () => {
        try {
          await api.delete('/orders/history/clear');
          const res = await api.get('/orders'); setOrders(res.data.data);
        } catch { show({ type: 'error', title: 'Error', message: 'Failed to clear history. Please try again.' }); }
      }
    });
  };

  const getTableReport = () => {
    const data = filteredAndSortedOrders.reduce((acc, o) => {
      const t = o.table_number || `Table ${o.table_id}`;
      if (!acc[t]) acc[t] = { orders: 0, revenue: 0 };
      acc[t].orders++; acc[t].revenue += o.total_amount; return acc;
    }, {});
    return Object.entries(data).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue);
  };

  const getPaymentReport = () => {
    const data = filteredAndSortedOrders.reduce((acc, o) => {
      const p = o.payment_method || 'Unpaid';
      if (!acc[p]) acc[p] = { orders: 0, revenue: 0 };
      acc[p].orders++; acc[p].revenue += o.total_amount; return acc;
    }, {});
    return Object.entries(data).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue);
  };

  const getTimeReport = () => {
    const data = filteredAndSortedOrders.reduce((acc, o) => {
      const hour = new Date(o.placed_at).getHours();
      const timeStr = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;
      if (!acc[timeStr]) acc[timeStr] = { orders: 0, revenue: 0, hour };
      acc[timeStr].orders++; acc[timeStr].revenue += o.total_amount; return acc;
    }, {});
    return Object.values(data).sort((a, b) => a.hour - b.hour);
  };

  const handleExport = () => {
    let dataToExport = [];
    if (reportType === 'Order Wise') dataToExport = filteredAndSortedOrders.map(o => ({ OrderID: o.id, Table: o.table_number, Customer: o.customer_name || 'Guest', Total: o.total_amount, Payment: o.payment_method || 'Unpaid', Status: o.status, Time: toISTFull(o.placed_at) }));
    else if (reportType === 'Table Wise') dataToExport = getTableReport().map(r => ({ Table: r.name, Orders: r.orders, Revenue: r.revenue }));
    else if (reportType === 'Dish Wise') dataToExport = dishReport.map(r => ({ Dish: r.name, QuantitySold: r.total_sold, Revenue: r.revenue }));
    else if (reportType === 'Payment Wise') dataToExport = getPaymentReport().map(r => ({ PaymentMethod: r.name, Orders: r.orders, Revenue: r.revenue }));
    else if (reportType === 'Time Wise') dataToExport = getTimeReport().map(r => ({ Time: `${String(r.hour).padStart(2, '0')}:00`, Orders: r.orders, Revenue: r.revenue }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportType}_Report.xlsx`);
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
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">{filteredAndSortedOrders.length} orders shown</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5">
            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="text-sm bg-transparent text-gray-300 outline-none" />
            <span className="text-gray-600 text-xs">to</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="text-sm bg-transparent text-gray-300 outline-none" />
          </div>
          <select value={reportType} onChange={e => setReportType(e.target.value)} className={selectClass}>
            {['Order Wise', 'Table Wise', 'Dish Wise', 'Payment Wise', 'Time Wise'].map(o => <option key={o}>{o}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-4 py-2.5 rounded-xl font-bold text-sm transition-all uppercase tracking-wider">
            <Download size={14} /> Export
          </button>
          <button onClick={clearHistory} className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-4 py-2.5 rounded-xl font-medium text-sm transition-all uppercase tracking-wider">
            <Trash2 size={14} /> Clear Billed
          </button>
        </div>
      </motion.div>

      {/* Table Container */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">

        {/* Order Wise */}
        {reportType === 'Order Wise' && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                {[['Order #', 'id'], ['Table', 'table_number'], ['Customer', 'customer_name'], ['Total', 'total_amount'], ['Payment', 'payment_method'], ['Status', 'status'], ['Time', 'placed_at']].map(([l, k]) => (
                  <th key={k} className={thClass} onClick={() => handleSort(k)}>
                    {l} {sortConfig.key === k ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.length === 0 && (
                <tr><td colSpan="7" className="px-5 py-14 text-center">
                  <FileText size={36} className="mx-auto mb-3 text-gray-700" strokeWidth={1} />
                  <p className="text-gray-600 text-sm uppercase tracking-widest">No orders yet</p>
                </td></tr>
              )}
              {filteredAndSortedOrders.map(order => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className={tdClass}>
                    <span className="font-black text-gray-200">#{order.order_number ? String(order.order_number).padStart(2, '0') : order.id}</span>
                    <span className="text-xs text-gray-600 ml-1.5">(ID:{order.id})</span>
                  </td>
                  <td className={tdClass}>
                    <button onClick={() => setSelectedOrder(order)} className="text-amber-500 hover:text-amber-400 font-semibold underline-offset-2 hover:underline transition-all">
                      {order.table_number || `Table ${order.table_id}`}
                    </button>
                  </td>
                  <td className={`${tdClass} text-gray-400`}>{order.customer_name || 'Guest'}</td>
                  <td className={tdClass}><span className="font-black text-amber-500">₹{order.total_amount}</span></td>
                  <td className={`${tdClass} text-gray-500`}>{order.payment_method || '—'}</td>
                  <td className={tdClass}>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${STATUS_COLORS[order.status] || 'bg-white/5 text-gray-500 border-white/10'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className={`${tdClass} text-xs text-gray-600 whitespace-nowrap`}>{toISTFull(order.placed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Table Wise */}
        {reportType === 'Table Wise' && (
          <table className="w-full text-left">
            <SimpleTableHead cols={['Table Name', 'Total Orders', 'Total Revenue']} />
            <tbody className="divide-y divide-white/5">
              {getTableReport().map(row => (
                <tr key={row.name} className="hover:bg-white/[0.02] transition-colors">
                  <td className={`${tdClass} font-bold text-gray-200`}>{row.name}</td>
                  <td className={`${tdClass} text-gray-400`}>{row.orders}</td>
                  <td className={tdClass}><AmberValue v={row.revenue.toFixed(2)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Payment Wise */}
        {reportType === 'Payment Wise' && (
          <table className="w-full text-left">
            <SimpleTableHead cols={['Payment Method', 'Total Orders', 'Total Revenue']} />
            <tbody className="divide-y divide-white/5">
              {getPaymentReport().map(row => (
                <tr key={row.name} className="hover:bg-white/[0.02] transition-colors">
                  <td className={`${tdClass} font-bold text-gray-200`}>{row.name}</td>
                  <td className={`${tdClass} text-gray-400`}>{row.orders}</td>
                  <td className={tdClass}><AmberValue v={row.revenue.toFixed(2)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Time Wise */}
        {reportType === 'Time Wise' && (
          <table className="w-full text-left">
            <SimpleTableHead cols={['Time Slot', 'Total Orders', 'Total Revenue']} />
            <tbody className="divide-y divide-white/5">
              {getTimeReport().map(row => (
                <tr key={row.hour} className="hover:bg-white/[0.02] transition-colors">
                  <td className={`${tdClass} font-bold text-gray-200`}>{`${String(row.hour).padStart(2, '0')}:00 — ${String(row.hour + 1).padStart(2, '0')}:00`}</td>
                  <td className={`${tdClass} text-gray-400`}>{row.orders}</td>
                  <td className={tdClass}><AmberValue v={row.revenue.toFixed(2)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Dish Wise */}
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

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </AnimatePresence>
      {DialogUI}
    </div>
  );
};

export default OrdersPage;
