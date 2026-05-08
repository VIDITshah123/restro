import React, { useState, useEffect } from 'react';
import api from '../../api';
import { toIST, toISTFull } from '../../lib/utils';

const STATUS_COLORS = {
  placed:    'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready:     'bg-green-100 text-green-700',
  served:    'bg-purple-100 text-purple-700',
  billed:    'bg-gray-200 text-gray-600',
};

const OrderDetailModal = ({ order, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/orders/${order.id}`);
        setDetails(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [order.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Order #{order.id}</h2>
              <p className="text-gray-500">{order.table_number} • {order.customer_name || 'Guest'}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading details...</p>
          ) : details && details.items ? (
            <div className="space-y-3">
              {details.items.map(item => (
                <div key={item.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">
                        {item.quantity}x {item.name}
                      </p>
                      {item.special_notes && item.special_notes.trim() !== '' && (
                        <p className="text-sm text-orange-600 font-semibold mt-1">
                          📝 {item.special_notes}
                        </p>
                      )}
                    </div>
                    <span className="font-medium text-gray-700">₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
              <div className="border-t-2 border-black pt-3 mt-4 flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-black">₹{details.total_amount}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No details available</p>
          )}
        </div>
      </div>
    </div>
  );
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reportType, setReportType] = useState('Order Wise');
  const [dishReport, setDishReport] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'placed_at', direction: 'desc' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedOrders = React.useMemo(() => {
    let result = [...orders];
    if (dateRange.start) {
      result = result.filter(o => new Date(o.placed_at) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setDate(end.getDate() + 1);
      result = result.filter(o => new Date(o.placed_at) < end);
    }
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'table_number') {
        aVal = a.table_number || '';
        bVal = b.table_number || '';
      } else if (sortConfig.key === 'customer_name') {
        aVal = (a.customer_name || 'Guest').toLowerCase();
        bVal = (b.customer_name || 'Guest').toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [orders, sortConfig, dateRange]);

  useEffect(() => {
    if (reportType === 'Dish Wise') {
      api.get('/analytics/top-dishes?limit=1000').then(res => setDishReport(res.data.data)).catch(console.error);
    }
  }, [reportType]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders');
        setOrders(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear ALL billed order history? This cannot be undone.')) return;
    try {
      await api.delete('/orders/history/clear');
      const res = await api.get('/orders');
      setOrders(res.data.data);
      alert('Order history cleared!');
    } catch (err) {
      alert('Error clearing history');
    }
  };

  const getTableReport = () => {
    const data = orders.reduce((acc, o) => {
      const t = o.table_number || `Table ${o.table_id}`;
      if (!acc[t]) acc[t] = { orders: 0, revenue: 0 };
      acc[t].orders++;
      acc[t].revenue += o.total_amount;
      return acc;
    }, {});
    return Object.entries(data).map(([name, stats]) => ({ name, ...stats })).sort((a,b) => b.revenue - a.revenue);
  };

  const getPaymentReport = () => {
    const data = orders.reduce((acc, o) => {
      const p = o.payment_method || 'Unpaid';
      if (!acc[p]) acc[p] = { orders: 0, revenue: 0 };
      acc[p].orders++;
      acc[p].revenue += o.total_amount;
      return acc;
    }, {});
    return Object.entries(data).map(([name, stats]) => ({ name, ...stats })).sort((a,b) => b.revenue - a.revenue);
  };

  const getTimeReport = () => {
    const data = orders.reduce((acc, o) => {
      const hour = new Date(o.placed_at).getHours();
      const timeStr = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;
      if (!acc[timeStr]) acc[timeStr] = { orders: 0, revenue: 0, hour };
      acc[timeStr].orders++;
      acc[timeStr].revenue += o.total_amount;
      return acc;
    }, {});
    return Object.values(data).sort((a,b) => a.hour - b.hour);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders History & Reports</h1>
        <div className="flex gap-4">
          {reportType === 'Order Wise' && (
            <div className="flex gap-2">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange({...dateRange, start: e.target.value})}
                className="border-2 border-gray-200 rounded-lg px-2 py-1 text-sm outline-none"
              />
              <span className="self-center text-gray-500">to</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange({...dateRange, end: e.target.value})}
                className="border-2 border-gray-200 rounded-lg px-2 py-1 text-sm outline-none"
              />
            </div>
          )}
          <select 
            value={reportType}
            onChange={e => setReportType(e.target.value)}
            className="border-2 border-gray-200 rounded-lg px-4 py-2 font-bold outline-none"
          >
            <option>Order Wise</option>
            <option>Table Wise</option>
            <option>Dish Wise</option>
            <option>Payment Wise</option>
            <option>Time Wise</option>
          </select>
          <button 
            onClick={clearHistory}
            className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium hover:bg-red-100"
          >
            Clear Billed History
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {reportType === 'Order Wise' && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th onClick={() => handleSort('id')} className="p-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-200">
                  Order # {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('table_number')} className="p-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-200">
                  Table {sortConfig.key === 'table_number' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('customer_name')} className="p-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-200">
                  Customer {sortConfig.key === 'customer_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('total_amount')} className="p-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-200">
                  Total {sortConfig.key === 'total_amount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('payment_method')} className="p-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-200">
                  Payment {sortConfig.key === 'payment_method' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('status')} className="p-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-200">
                  Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('placed_at')} className="p-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-200">
                  Time {sortConfig.key === 'placed_at' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 && (
                <tr>
                <th colSpan="7" className="p-10 text-center text-gray-400">No orders yet.</th>
                </tr>
              )}
              {filteredAndSortedOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">
                    {order.order_number ? `#${String(order.order_number).padStart(2, '0')}` : `#${order.id}`}
                    <span className="text-xs text-gray-400 font-normal ml-2">(ID:{order.id})</span>
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="text-blue-600 hover:text-blue-800 font-semibold underline"
                    >
                      {order.table_number || `Table ${order.table_id}`}
                    </button>
                  </td>
                  <td className="p-4 text-gray-700">{order.customer_name || 'Guest'}</td>
                  <td className="p-4 font-medium text-gray-800">₹{order.total_amount}</td>
                  <td className="p-4 font-semibold text-gray-600">{order.payment_method || '—'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {toISTFull(order.placed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'Table Wise' && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-600">Table Name</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Total Orders</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {getTableReport().map(row => (
                <tr key={row.name} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">{row.name}</td>
                  <td className="p-4 text-gray-700">{row.orders}</td>
                  <td className="p-4 font-medium text-green-700">₹{row.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'Payment Wise' && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-600">Payment Method</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Total Orders</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {getPaymentReport().map(row => (
                <tr key={row.name} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">{row.name}</td>
                  <td className="p-4 text-gray-700">{row.orders}</td>
                  <td className="p-4 font-medium text-green-700">₹{row.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'Time Wise' && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-600">Time Slot</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Total Orders</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {getTimeReport().map(row => (
                <tr key={row.hour} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">{`${String(row.hour).padStart(2, '0')}:00 - ${String(row.hour + 1).padStart(2, '0')}:00`}</td>
                  <td className="p-4 text-gray-700">{row.orders}</td>
                  <td className="p-4 font-medium text-green-700">₹{row.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'Dish Wise' && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-600">Dish Name</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Total Quantity Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dishReport.map(row => (
                <tr key={row.name} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">{row.name}</td>
                  <td className="p-4 font-medium text-gray-700">{row.total_sold} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};

export default OrdersPage;
