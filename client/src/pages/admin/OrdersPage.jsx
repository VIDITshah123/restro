import { useState, useEffect } from 'react';
import api from '../../api';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);

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
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Orders Management</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Order ID</th>
              <th className="p-4">Table</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">#{order.id}</td>
                <td className="p-4">{order.table_number}</td>
                <td className="p-4">{order.customer_name || 'Guest'}</td>
                <td className="p-4 font-medium">₹{order.total_amount}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                    ${order.status === 'served' ? 'bg-gray-100 text-gray-600' : 
                      order.status === 'ready' ? 'bg-green-100 text-green-700' :
                      order.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersPage;
