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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders History</h1>
        <button 
          onClick={clearHistory}
          className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium hover:bg-red-100"
        >
          Clear Billed History
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-sm font-semibold text-gray-600">Order #</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Table</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Customer</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Total</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Payment</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 && (
              <tr>
              <th colSpan="7" className="p-10 text-center text-gray-400">No orders yet.</th>
              </tr>
            )}
            {orders.map(order => (
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
                    {order.table_number}
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
      </div>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};

export default OrdersPage;
