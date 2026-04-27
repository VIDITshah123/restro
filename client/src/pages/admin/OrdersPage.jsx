import React, { useState, useEffect } from 'react';
import api from '../../api';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleExpand = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (!orderDetails[orderId]) {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrderDetails(prev => ({ ...prev, [orderId]: res.data.data }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const generateBill = async (orderId) => {
    if (!confirm('Generate bill and mark table as free?')) return;
    try {
      await api.post(`/orders/${orderId}/bill`);
      fetchOrders();
      setExpandedOrderId(null);
    } catch (err) {
      alert('Error generating bill');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Orders & Billing</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
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
              <React.Fragment key={order.id}>
                <tr 
                  onClick={() => toggleExpand(order.id)} 
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${expandedOrderId === order.id ? 'bg-gray-50' : ''}`}
                >
                  <td className="p-4 font-bold">#{order.id}</td>
                  <td className="p-4">{order.table_number}</td>
                  <td className="p-4">{order.customer_name || 'Guest'}</td>
                  <td className="p-4 font-medium">₹{order.total_amount}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                      ${order.status === 'billed' ? 'bg-gray-200 text-gray-700' : 
                        order.status === 'served' ? 'bg-purple-100 text-purple-700' : 
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
                {expandedOrderId === order.id && orderDetails[order.id] && (
                  <tr>
                    <td colSpan="6" className="p-0 border-b">
                      <div className="bg-gray-50 p-6 shadow-inner border-t">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-lg">Order Details</h3>
                          {order.status !== 'billed' && (
                            <button 
                              onClick={() => generateBill(order.id)}
                              className="bg-black text-white px-4 py-2 rounded-lg font-bold shadow-sm"
                            >
                              Generate Bill
                            </button>
                          )}
                        </div>
                        <div className="bg-white rounded-lg border overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 border-b">
                              <tr>
                                <th className="p-3">Item</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3">Special Instructions</th>
                                <th className="p-3 text-right">Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {orderDetails[order.id].items.map(item => (
                                <tr key={item.id}>
                                  <td className="p-3 font-medium">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    {item.name}
                                  </td>
                                  <td className="p-3 text-center font-bold">{item.quantity}</td>
                                  <td className="p-3 text-gray-500 text-xs">{item.special_notes || '-'}</td>
                                  <td className="p-3 text-right font-medium">₹{item.price * item.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td colSpan="3" className="p-3 text-right font-bold text-gray-600">Grand Total</td>
                                <td className="p-3 text-right font-bold text-lg">₹{order.total_amount}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersPage;
