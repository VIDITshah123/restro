import React, { useState, useEffect } from 'react';
import api from '../../api';

const BillingPage = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBilling = async (tableId) => {
    setLoading(true);
    setSelectedTable(tableId);
    try {
      const res = await api.get(`/billing/${tableId}`);
      setBilling(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!selectedTable) return;
    if (!confirm('Generate bill for all orders on this table and mark it as free?')) return;
    try {
      await api.post(`/billing/${selectedTable}/generate`);
      setBilling(null);
      setSelectedTable(null);
      fetchTables();
      alert('Bill generated! Table is now free.');
    } catch (err) {
      alert('Error generating bill');
    }
  };

  const occupiedTables = tables.filter(t => t.is_occupied);

  return (
    <div className="p-6 flex gap-6 h-full min-h-screen">
      {/* Left: Table selector */}
      <div className="w-64 shrink-0">
        <h1 className="text-2xl font-bold mb-4">Billing</h1>
        <p className="text-sm text-gray-500 mb-4">Select an occupied table to view and generate their bill.</p>
        
        {occupiedTables.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-medium">No occupied tables</p>
          </div>
        ) : (
          <div className="space-y-2">
            {occupiedTables.map(table => (
              <button
                key={table.id}
                onClick={() => fetchBilling(table.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-bold ${
                  selectedTable === table.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white border-gray-200 hover:border-gray-400'
                }`}
              >
                {table.table_number}
                <span className="block text-xs font-normal opacity-60">Tap to view bill</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Bill details */}
      <div className="flex-1">
        {!selectedTable && (
          <div className="h-full flex items-center justify-center text-gray-300">
            <div className="text-center">
              <p className="text-6xl mb-4">🧾</p>
              <p className="font-bold text-xl">Select a table to view bill</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p className="font-medium">Loading bill...</p>
          </div>
        )}

        {billing && !loading && (
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">{tables.find(t => t.id === selectedTable)?.table_number}</h2>
                <p className="text-gray-500 text-sm">{billing.orders.length} order(s) in session</p>
              </div>
              <button
                onClick={handleGenerateBill}
                disabled={billing.orders.length === 0}
                className="bg-black text-white font-bold px-6 py-2 rounded-xl disabled:opacity-40"
              >
                Generate Bill
              </button>
            </div>

            {billing.orders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No pending orders for this table.</p>
            ) : (
              <div className="space-y-4">
                {billing.orders.map((order, idx) => (
                  <div key={order.id} className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex justify-between text-sm font-semibold text-gray-600">
                      <span>Order #{order.id} — {order.customer_name || 'Guest'}</span>
                      <span>{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y">
                        {order.items.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-2">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {item.name}
                              {item.special_notes ? (
                                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">{item.special_notes}</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-2 text-center text-gray-500">x{item.quantity}</td>
                            <td className="px-4 py-2 text-right font-medium">₹{item.price * item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-2 bg-gray-50 flex justify-between text-sm font-bold border-t">
                      <span>Subtotal</span>
                      <span>₹{order.total_amount}</span>
                    </div>
                  </div>
                ))}

                {/* Grand Total */}
                <div className="border-2 border-black rounded-xl px-6 py-4 flex justify-between items-center">
                  <span className="text-lg font-bold">Grand Total</span>
                  <span className="text-3xl font-black">₹{billing.grandTotal}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;
