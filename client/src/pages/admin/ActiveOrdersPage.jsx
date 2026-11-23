import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils, AlertTriangle, X, Check, Plus, Trash2, Clock,
  RefreshCw, User, ShoppingBag, Bike, Layers, Search
} from 'lucide-react';
import { toISTFull } from '../../lib/utils';
import { useAuthStore } from '../../store';
import PlaceOrderModal from '../../components/admin/PlaceOrderModal';
import AppDialog, { useDialog } from '../../components/AppDialog';

const CANCELLATION_REASONS = [
  'Customer changed mind',
  'Item unavailable / Out of stock',
  'Wrong item entered',
  'Order delay / taking too long',
  'Guest cancelled meal',
  'Other'
];

const ActiveOrdersPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Item cancellation modal
  const [cancellingItem, setCancellingItem] = useState(null); // { item, orderId, tableNumber }
  const [cancelReasonPreset, setCancelReasonPreset] = useState(CANCELLATION_REASONS[0]);
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Add items modal
  const [isPlaceOrderOpen, setIsPlaceOrderOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);

  const { name, role, email } = useAuthStore();
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();
  const socketRef = useRef(null);

  const fetchActiveOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get('/orders/sessions');
      // Filter only active (non-billed) sessions
      const activeOnly = (res.data.data || []).filter(s => s.status !== 'billed');
      setSessions(activeOnly);
    } catch (err) {
      console.error('Failed to load active orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveOrders();

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/admin`);
    socketRef.current = socket;

    socket.on('kot:new', () => fetchActiveOrders());
    socket.on('order:billed', () => fetchActiveOrders());
    socket.on('table:statusChanged', () => fetchActiveOrders());
    socket.on('order:itemCancelled', () => fetchActiveOrders());

    const interval = setInterval(fetchActiveOrders, 15000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [fetchActiveOrders]);

  const openCancelModal = (item, orderId, tableNumber) => {
    setCancellingItem({ item, orderId, tableNumber });
    setCancelReasonPreset(CANCELLATION_REASONS[0]);
    setCancelCustomReason('');
    setCancelError('');
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancellingItem) return;

    let finalReason = cancelReasonPreset;
    if (cancelReasonPreset === 'Other') {
      if (!cancelCustomReason.trim()) {
        setCancelError('Please specify the reason for cancellation.');
        return;
      }
      finalReason = cancelCustomReason.trim();
    }

    setIsSubmittingCancel(true);
    try {
      await api.patch(`/order-items/${cancellingItem.item.id}/cancel`, {
        reason: finalReason,
        cancelledByName: name || email || 'Staff',
        cancelledByRole: role || 'admin',
        cancelledById: 1
      });

      await showAlert(`Cancelled ${cancellingItem.item.quantity}× "${cancellingItem.item.name}". Reason logged.`, {
        title: 'Item Cancelled'
      });
      setCancellingItem(null);
      fetchActiveOrders();
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to cancel item.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleOpenAddItems = (session) => {
    setSelectedTableForOrder({
      id: session.tableId,
      table_number: session.tableNumber
    });
    setIsPlaceOrderOpen(true);
  };

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesTable = s.tableNumber?.toLowerCase().includes(q);
    const matchesOrder = s.orderNumbers?.some(n => String(n).includes(q));
    const matchesItem = s.items?.some(it => it.name?.toLowerCase().includes(q));
    return matchesTable || matchesOrder || matchesItem;
  });

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <Utensils size={20} className="text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
                Active Table Orders
              </h1>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-0.5">
                Live Tables · Item Cancellation · Add Rounds
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchActiveOrders(true)}
            className="flex items-center gap-1.5 bg-[#141414] hover:bg-white/5 text-gray-400 border border-white/10 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => { setSelectedTableForOrder(null); setIsPlaceOrderOpen(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} /> New Order
          </button>
        </div>
      </motion.div>

      {/* ── Search Bar ── */}
      <div className="mb-6 flex items-center gap-2 max-w-md bg-[#0f0f0f] border border-white/10 rounded-xl px-3.5 py-2.5">
        <Search size={16} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search by table, order #, or dish name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm text-gray-200 outline-none w-full"
        />
      </div>

      {/* ── Active Sessions Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredSessions.map(session => (
          <motion.div
            key={session.sessionId}
            layout
            className="bg-[#0f0f0f] border border-red-500/20 hover:border-red-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all"
          >
            <div>
              {/* Card Header: Table + Session metadata */}
              <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <h3 className="text-xl font-serif font-black text-gray-100 flex items-center gap-2">
                      {session.orderType === 'takeaway' && <ShoppingBag size={18} className="text-purple-400" />}
                      {session.orderType === 'delivery' && <Bike size={18} className="text-orange-400" />}
                      {session.tableNumber}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                      {session.orderCount} order round{session.orderCount > 1 ? 's' : ''} (
                      {session.orderNumbers?.map(n => `#${n}`).join(', ') || session.orderIds?.map(i => `#${i}`).join(', ')})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-amber-500 font-mono">
                    ₹{session.totalAmount}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">
                    Current Bill
                  </span>
                </div>
              </div>

              {/* Items List grouped by Order */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {session.orders?.map((ord, ordIdx) => (
                  <div key={ord.id} className="bg-[#141414] border border-white/5 rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-1.5">
                      <span className="font-bold text-amber-400">
                        Round {ordIdx + 1} · Order #{ord.order_number || ord.id}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {toISTFull(ord.placed_at)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {ord.items?.map(item => {
                        const isCancelled = item.is_cancelled === 1;
                        return (
                          <div
                            key={item.id}
                            className={`flex justify-between items-center p-1.5 rounded-lg transition-colors ${
                              isCancelled ? 'bg-red-500/5 opacity-50' : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <span className={`font-medium ${isCancelled ? 'line-through text-red-400' : 'text-gray-200'}`}>
                                <strong className="text-amber-500 font-mono">{item.quantity}×</strong> {item.name}
                              </span>
                              {item.special_notes && (
                                <span className="block text-[10px] text-gray-500 italic truncate">
                                  📝 {item.special_notes}
                                </span>
                              )}
                              {isCancelled && (
                                <span className="block text-[10px] text-red-400 font-bold">
                                  Cancelled: {item.cancelled_reason || 'Staff cancelled'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono font-bold text-gray-300">
                                ₹{item.price * item.quantity}
                              </span>
                              {!isCancelled && (
                                <button
                                  onClick={() => openCancelModal(item, ord.id, session.tableNumber)}
                                  className="p-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                  title="Cancel this item"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="flex gap-2.5 mt-5 pt-3 border-t border-white/5">
              <button
                onClick={() => handleOpenAddItems(session)}
                className="flex-1 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Items to Table
              </button>
            </div>
          </motion.div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-600 bg-[#0f0f0f] border border-white/5 rounded-3xl">
            <Utensils size={44} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
            <p className="text-base font-bold text-gray-400">No active orders right now.</p>
            <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest">
              Orders placed on tables or takeaway will show here until billed.
            </p>
          </div>
        )}
      </div>

      {/* ── CANCEL ITEM MODAL WITH MANDATORY REASON ── */}
      <AnimatePresence>
        {cancellingItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCancellingItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0f0f0f] border border-red-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-400" />
                  <h3 className="font-serif font-black text-lg text-gray-100">
                    Cancel Item
                  </h3>
                </div>
                <button onClick={() => setCancellingItem(null)} className="text-gray-500 hover:text-gray-300">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#141414] border border-white/5 rounded-xl p-3.5 space-y-1 text-xs">
                <p className="text-gray-400">
                  Table: <strong className="text-gray-200">{cancellingItem.tableNumber}</strong>
                </p>
                <p className="text-gray-400">
                  Item to cancel: <strong className="text-red-400 font-bold">{cancellingItem.item.quantity}× {cancellingItem.item.name}</strong>
                </p>
                <p className="text-[10px] text-gray-500 italic mt-1">
                  Note: A permanent cancellation record with timestamp and staff signature will be logged.
                </p>
              </div>

              <form onSubmit={handleConfirmCancel} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Select Reason <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={cancelReasonPreset}
                    onChange={e => setCancelReasonPreset(e.target.value)}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 outline-none focus:border-red-500/50"
                  >
                    {CANCELLATION_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {cancelReasonPreset === 'Other' && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Specify Custom Reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Why is this item being cancelled?..."
                      value={cancelCustomReason}
                      onChange={e => setCancelCustomReason(e.target.value)}
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-red-500/50"
                    />
                  </div>
                )}

                {cancelError && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                    {cancelError}
                  </p>
                )}

                <div className="flex gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setCancellingItem(null)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-gray-200 font-bold text-xs uppercase tracking-wider"
                  >
                    Keep Item
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCancel}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Place Order Modal (for adding items to table) */}
      <PlaceOrderModal
        isOpen={isPlaceOrderOpen}
        onClose={() => { setIsPlaceOrderOpen(false); setSelectedTableForOrder(null); }}
        onOrderPlaced={() => fetchActiveOrders()}
        defaultOrderType={selectedTableForOrder ? 'dine_in' : 'takeaway'}
        preselectedTableId={selectedTableForOrder?.id}
      />

      <AppDialog dialogState={dialogState} closeDialog={closeDialog} />
    </div>
  );
};

export default ActiveOrdersPage;
