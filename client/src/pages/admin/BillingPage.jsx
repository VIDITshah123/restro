import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../../api';
import { toISTFull } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Receipt, Loader2, Printer, Flag, ShoppingBag, Bike, Utensils, Globe, MapPin, Phone, User } from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';
import ThermalReceipt from '../../components/admin/ThermalReceipt';

const BillingPage = () => {
  const [tables, setTables] = useState([]);
  const [directOrders, setDirectOrders] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null); // { type: 'table'|'order', id, data }
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeReports, setActiveReports] = useState([]);
  const [billingTab, setBillingTab] = useState('all'); // 'all' | 'tables' | 'direct'
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();

  const loadBillRequests = () => {
    try { return new Set(JSON.parse(localStorage.getItem('billRequestedTables') || '[]')); }
    catch { return new Set(); }
  };
  const [billRequestedTables, setBillRequestedTables] = useState(loadBillRequests);

  const persistBillRequests = (tableSet) => {
    localStorage.setItem('billRequestedTables', JSON.stringify([...tableSet]));
    window.dispatchEvent(new Event('billRequestsUpdated'));
  };

  const addNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const fetchPendingData = async () => {
    try {
      const res = await api.get('/billing/pending');
      const data = res.data.data || { tables: [], directOrders: [] };
      setTables(data.tables || []);
      setDirectOrders(data.directOrders || []);

      setBillRequestedTables(prev => {
        const occupiedIds = new Set((data.tables || []).map(t => t.id));
        const occupiedNames = new Set((data.tables || []).map(t => t.table_number));
        const next = new Set([...prev].filter(id => occupiedIds.has(id) || occupiedNames.has(id)));
        if (next.size !== prev.size) persistBillRequests(next);
        return next;
      });
    } catch (err) {
      console.error('Error fetching pending billing data:', err);
    }
  };

  useEffect(() => {
    fetchPendingData();
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/admin`);

    socket.on('notification:bill_request', (data) => {
      setBillRequestedTables(prev => {
        const next = new Set(prev);
        next.add(data.tableId || data.tableNumber);
        persistBillRequests(next);
        return next;
      });
      addNotification(`Table ${data.tableNumber || data.tableId} requested bill!`);
    });

    socket.on('table:statusChanged', () => fetchPendingData());
    socket.on('kot:new', () => fetchPendingData());
    socket.on('order:billed', () => fetchPendingData());

    const interval = setInterval(fetchPendingData, 15000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

    const handleSelectTable = async (table) => {
      setLoading(true);
      setSelectedTarget({ type: 'table', id: table.id, data: table });
      try {
          const [res, reportsRes] = await Promise.all([
            api.get(`/billing/${table.id}`),
            api.get(`/reports/table/${table.id}`)
          ]);
          setBilling({
            ...res.data.data,
            tableLabel: table.table_number,
            orderType: 'dine_in'
          });
          setActiveReports(reportsRes.data.data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      const handleSelectDirectOrder = (order) => {
        setSelectedTarget({ type: 'order', id: order.id, data: order });
        setActiveReports([]);
        setBilling({
          orders: [order],
          grandTotal: order.total_amount,
          tableLabel: order.table_number,
          orderType: order.order_type,
          onlinePlatform: order.online_platform,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerAddress: order.customer_address
        });
      };

      const handleGenerateBill = async () => {
        if (!selectedTarget) return;

        const label = billing?.tableLabel || 'this order';
        const confirmed = await showConfirm(
          `Generate bill for ${label} via ${paymentMethod}?`,
          { title: 'Generate Bill', confirmLabel: 'Generate Bill' }
        );
        if (!confirmed) return;

        try {
          if (selectedTarget.type === 'table') {
            await api.post(`/billing/${selectedTarget.id}/generate`, { payment_method: paymentMethod });
            setBillRequestedTables(prev => {
              const next = new Set(prev);
              next.delete(selectedTarget.id);
              persistBillRequests(next);
              return next;
            });
          } else {
            await api.post(`/orders/${selectedTarget.id}/bill-single`, { payment_method: paymentMethod });
          }

          setBilling(null);
          setSelectedTarget(null);
          setActiveReports([]);
          fetchPendingData();
          await showAlert(`Bill generated successfully for ${label}!`, { title: 'Success ✓' });
        } catch {
          await showAlert('Failed to generate bill. Please try again.', { title: 'Error', danger: true });
        }
      };

      const totalPending = tables.length + directOrders.length;

      return (
        <div className="p-8 flex gap-6 min-h-screen bg-[#0a0a0a] text-gray-200">

          {/* Left Panel */}
            <div className="w-80 shrink-0">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex justify-between items-center mb-3">
                  <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
                    Billing
                  </h1>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {totalPending} Active
                  </span>
                </div>

                  {/* Tab Filter */}
                  <div className="grid grid-cols-3 gap-1 bg-[#141414] border border-white/5 p-1 rounded-xl mb-4 text-xs font-bold">
                    <button
                      onClick={() => setBillingTab('all')}
                      className={`py-1.5 rounded-lg transition-all uppercase tracking-wider ${billingTab === 'all' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                      All ({totalPending})
                    </button>
                    <button
                      onClick={() => setBillingTab('tables')}
                      className={`py-1.5 rounded-lg transition-all uppercase tracking-wider ${billingTab === 'tables' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                      Tables ({tables.length})
                    </button>
                    <button
                      onClick={() => setBillingTab('direct')}
                      className={`py-1.5 rounded-lg transition-all uppercase tracking-wider ${billingTab === 'direct' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                      Takeaway ({directOrders.length})
                    </button>
                  </div>

                    <p className="text-xs text-gray-600 mb-4 uppercase tracking-wider">
                      Select an active table or direct order to view and generate bill.
                    </p>

          {totalPending === 0 ? (
                    <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6 text-center">
                      <p className="text-3xl mb-2">🎉</p>
                      <p className="text-gray-600 text-sm uppercase tracking-widest font-bold">No active bills</p>
                      <p className="text-gray-700 text-xs mt-1">All tables & orders are settled</p>
                    </div>
                  ) : (
                      <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">

                        {/* Dine-In Tables Section */}
                        {(billingTab === 'all' || billingTab === 'tables') && tables.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block px-1">
                              Dine-In Tables ({tables.length})
                            </span>
                            {tables.map(table => {
                              const isRequested = billRequestedTables.has(table.id) || billRequestedTables.has(table.table_number);
                              const isSelected = selectedTarget?.type === 'table' && selectedTarget?.id === table.id;
                              return (
                                <button
                                  key={`tbl-${table.id}`}
                                  onClick={() => handleSelectTable(table)}
                                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all font-bold relative text-sm ${isSelected
                                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
                                      : isRequested
                                        ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse'
                                        : 'bg-[#0f0f0f] border-white/5 text-gray-300 hover:border-white/20 hover:text-gray-100'
                                    }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1.5">
                                      <Utensils size={14} className="text-amber-500/70" />
                                      {table.table_number}
                                    </span>
                                    <span className="text-xs font-black text-amber-500">₹{table.total_amount || 0}</span>
                                  </div>
                                  {isRequested && (
                                    <span className="absolute top-2 right-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                      Bill!
                                    </span>
                                  )}
                                  <span className="block text-xs font-normal opacity-50 mt-0.5">
                                    {table.order_count} order(s) placed
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Takeaway & Home Delivery Section */}
                        {(billingTab === 'all' || billingTab === 'direct') && directOrders.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block px-1">
                              Takeaway & Delivery ({directOrders.length})
                            </span>
                            {directOrders.map(order => {
                              const isSelected = selectedTarget?.type === 'order' && selectedTarget?.id === order.id;
                              const isTakeaway = order.order_type === 'takeaway';
                              return (
                                <button
                                  key={`ord-${order.id}`}
                                  onClick={() => handleSelectDirectOrder(order)}
                                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all font-bold relative text-sm ${isSelected
                                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
                                      : 'bg-[#0f0f0f] border-white/5 text-gray-300 hover:border-white/20 hover:text-gray-100'
                                    }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="flex items-center gap-1.5">
                                      {isTakeaway ? (
                                        <ShoppingBag size={14} className="text-purple-400" />
                                      ) : (
                                        <Bike size={14} className="text-orange-400" />
                                      )}
                                      {order.table_number}
                                    </span>
                                    <span className="text-xs font-black text-amber-500">₹{order.total_amount}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-normal text-gray-400">
                                    <span>Order #{order.order_number || order.id}</span>
                                    {order.online_platform && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        {order.online_platform}
                                      </span>
                                    )}
                                  </div>
                                  {order.customer_name && (
                                    <span className="block text-[11px] text-gray-500 truncate mt-0.5">
                                      👤 {order.customer_name}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                      </div>
          )}
                    </motion.div>
      </div>

                {/* Right Panel */}
                <div className="flex-1">
                    {!selectedTarget && !loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Receipt size={56} className="text-gray-800 mx-auto mb-4" strokeWidth={1} />
                      <p className="font-serif text-gray-600 text-lg italic">Select a table or takeaway order to view bill</p>
                    </div>
                  </motion.div>
        )}

                  {loading && (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 size={32} className="text-amber-500/40 animate-spin" />
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {billing && !loading && (
                      <motion.div
                        key={`${selectedTarget?.type}-${selectedTarget?.id}`}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6"
                      >
                        {/* Active customer issues alert */}
                        {activeReports.length > 0 && (
                          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col gap-2 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                              <Flag size={16} className="text-red-500 animate-pulse" />
                              Active Issues Reported by Customer
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                              {activeReports.map(rep => (
                                <div key={rep.id} className="text-xs text-gray-300 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                                  <span className="font-semibold text-white">{rep.type === 'food' ? '🍽️ Food' : '⚠️ Other'}:</span> "{rep.description}"
                                  <span className="text-[10px] text-gray-500 block mt-0.5">{new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Order Channel & Meta Details */}
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex justify-between items-start flex-wrap gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h2 className="text-2xl font-serif font-black text-gray-100">
                                    {billing.tableLabel}
                                  </h2>
                                  {billing.orderType === 'takeaway' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                      Takeaway
                                    </span>
                                  )}
                                  {billing.orderType === 'delivery' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                      Free Home Delivery
                                    </span>
                                  )}
                                  {billing.onlinePlatform && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                      <Globe size={11} /> {billing.onlinePlatform}
                                    </span>
                                  )}
                                </div>
                                <p className="text-amber-500/60 text-xs mt-1 uppercase tracking-widest">
                                  {billing.orders.length} order(s) in session
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => window.print()}
                                  disabled={billing.orders.length === 0}
                                  className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 font-bold px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider text-xs cursor-pointer"
                                >
                                  <Printer size={14} /> Print Receipt
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={handleGenerateBill}
                                  disabled={billing.orders.length === 0}
                                  className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black px-4 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider text-xs cursor-pointer"
                                >
                                  <Receipt size={14} /> Generate Bill
                                </motion.button>
                              </div>
                            </div>

                            {/* Customer Details banner if available */}
                            {(billing.customerName || billing.customerPhone || billing.customerAddress) && (
                              <div className="bg-[#141414] border border-white/5 rounded-xl p-3.5 flex flex-wrap gap-4 text-xs">
                                {billing.customerName && (
                                  <div className="flex items-center gap-1.5 text-gray-200">
                                    <User size={13} className="text-amber-500" />
                                    <span className="font-bold">{billing.customerName}</span>
                                  </div>
                                )}
                                {billing.customerPhone && (
                                  <div className="flex items-center gap-1.5 text-gray-300">
                                    <Phone size={13} className="text-amber-500" />
                                    <span>{billing.customerPhone}</span>
                                  </div>
                                )}
                                {billing.customerAddress && (
                                  <div className="flex items-center gap-1.5 text-gray-300 flex-1">
                                    <MapPin size={13} className="text-amber-500 shrink-0" />
                                    <span className="truncate">{billing.customerAddress}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Payment method selector — always visible & reactive */}
                            <div>
                              <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-2">Payment Method</p>
                              <div className="grid grid-cols-3 gap-2">
                                {['Cash', 'Online', 'Card'].map(m => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => setPaymentMethod(m)}
                                    className={`py-2.5 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                      paymentMethod === m
                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                                    }`}
                                  >
                                    {m}
                                  </button>
                    ))}
                  </div>
                </div>
              </div>

              {billing.orders.length === 0 ? (
                <p className="text-gray-600 text-center py-10 text-sm italic">No pending orders for this selection.</p>
              ) : (
                <div className="space-y-4">
                  {billing.orders.map(order => (
                    <div key={order.id} className="border border-white/5 rounded-2xl overflow-hidden">
                      <div className="bg-black/40 px-5 py-3 flex justify-between text-xs text-gray-500 uppercase tracking-widest border-b border-white/5">
                        <span>Order #{order.order_number || order.id}</span>
                        <span>{toISTFull(order.placed_at)}</span>
                      </div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-white/5">
                          {order.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-5 py-3 text-gray-300">
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {item.name}
                                {item.special_notes && (
                                  <span className="ml-2 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">{item.special_notes}</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-center text-gray-600 text-xs">×{item.quantity}</td>
                              <td className="px-5 py-3 text-right font-black text-gray-300">₹{item.price * item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-5 py-3 bg-black/40 flex justify-between text-xs font-bold border-t border-white/5">
                        <span className="text-gray-500 uppercase tracking-wider">Subtotal</span>
                        <span className="text-amber-500">₹{order.total_amount}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t-2 border-amber-500/20 pt-5 mt-2 flex justify-between items-center">
                    <span className="font-serif text-gray-400 tracking-wider text-sm uppercase">Grand Total</span>
                    <span className="text-3xl font-black text-amber-500">₹{billing.grandTotal}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {notifications.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0f0f0f] border border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.1)] rounded-2xl p-4 pointer-events-auto flex items-start gap-3"
            >
              <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl shrink-0">
                <Bell size={18} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-200 uppercase tracking-wider">Bill Request</p>
                <p className="text-gray-400 text-sm mt-0.5">{note.message}</p>
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== note.id))} className="text-gray-600 hover:text-gray-300 p-1 transition-colors">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Dialog */}
      <AppDialog dialogState={dialogState} closeDialog={closeDialog} />

      {/* Hidden print receipt area */}
      {billing && (
        <ThermalReceipt
          tableNumber={billing.tableLabel}
          orders={billing.orders}
          grandTotal={billing.grandTotal}
          paymentMethod={paymentMethod}
          orderType={billing.orderType}
          onlinePlatform={billing.onlinePlatform}
          customerName={billing.customerName}
          customerPhone={billing.customerPhone}
          customerAddress={billing.customerAddress}
        />
      )}
    </div>
  );
};

export default BillingPage;