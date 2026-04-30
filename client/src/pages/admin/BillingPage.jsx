import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../../api';
import { toIST } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

const BillingPage = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const loadBillRequests = () => {
    try {
      const stored = localStorage.getItem('billRequestedTables');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };
  
  const [billRequestedTables, setBillRequestedTables] = useState(loadBillRequests);

  const persistBillRequests = (tableSet) => {
    localStorage.setItem('billRequestedTables', JSON.stringify([...tableSet]));
  };

  const addNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    fetchTables();

    const socket = io('http://localhost:3000/admin');
    socket.on('notification:bill_request', (data) => {
      setBillRequestedTables(prev => {
        const next = new Set(prev);
        next.add(data.tableId || data.tableNumber);
        persistBillRequests(next);
        return next;
      });
      addNotification(`Table ${data.tableNumber || data.tableId} requested bill!`);
    });

    socket.on('table:statusChanged', (data) => {
      setTables(prev => {
        const existing = prev.find(t => t.id === data.tableId);
        if (existing) {
          return prev.map(t => t.id === data.tableId ? { ...t, is_occupied: data.isOccupied } : t);
        } else {
          fetchTables();
          return prev;
        }
      });
    });

    return () => socket.disconnect();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      const fetchedTables = res.data.data;
      setTables(fetchedTables);
      
      setBillRequestedTables(prev => {
        const occupiedIds = new Set(fetchedTables.filter(t => t.is_occupied).map(t => t.id));
        const occupiedNames = new Set(fetchedTables.filter(t => t.is_occupied).map(t => t.table_number));
        const next = new Set([...prev].filter(id => occupiedIds.has(id) || occupiedNames.has(id)));
        if (next.size !== prev.size) {
          persistBillRequests(next);
        }
        return next;
      });
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
      setBillRequestedTables(prev => {
        const next = new Set(prev);
        next.delete(selectedTable);
        persistBillRequests(next);
        return next;
      });
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
            {occupiedTables.map(table => {
              const isRequested = billRequestedTables.has(table.id) || billRequestedTables.has(table.table_number);
              return (
                <button
                  key={table.id}
                  onClick={() => fetchBilling(table.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-bold relative ${
                    selectedTable === table.id
                      ? 'bg-black text-white border-black'
                      : isRequested
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-800 animate-pulse'
                        : 'bg-white border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {table.table_number}
                  {isRequested && (
                    <span className="absolute top-1 right-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                      Bill Requested!
                    </span>
                  )}
                  <span className="block text-xs font-normal opacity-60">Tap to view bill</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

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
                      <span>{toIST(order.placed_at)}</span>
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

                <div className="border-2 border-black rounded-xl px-6 py-4 flex justify-between items-center">
                  <span className="text-lg font-bold">Grand Total</span>
                  <span className="text-3xl font-black">₹{billing.grandTotal}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {notifications.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-white border-2 border-yellow-400 shadow-lg rounded-xl p-4 pointer-events-auto flex items-start gap-3"
            >
              <div className="bg-yellow-100 p-2 rounded-full shrink-0">
                <Bell size={20} className="text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-800">Bill Request</p>
                <p className="text-gray-600 text-sm">{note.message}</p>
              </div>
              <button 
                onClick={() => removeNotification(note.id)}
                className="text-gray-400 hover:text-gray-600 shrink-0 p-1"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BillingPage;
