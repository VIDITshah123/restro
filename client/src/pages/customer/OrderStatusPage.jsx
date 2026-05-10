import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStatusSocket } from '../../hooks/useSocket';
import { useOrderStore } from '../../store';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { toIST } from '../../lib/utils';
import { ArrowLeft, ChefHat, UtensilsCrossed, CheckCircle, Clock, Bike, Receipt, ShoppingBag } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'received',  label: 'Order Placed',    desc: 'Sent to kitchen',              icon: ShoppingBag },
  { key: 'accepted',  label: 'Chef Accepted',   desc: 'Kitchen acknowledged order',   icon: ChefHat },
  { key: 'preparing', label: 'Preparing',       desc: 'Your food is being crafted…',  icon: UtensilsCrossed },
  { key: 'ready',     label: 'Ready to Serve',  desc: 'On its way to your table!',    icon: Bike },
  { key: 'served',    label: 'Served',          desc: 'Enjoy your meal! 🎉',          icon: CheckCircle },
];

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  useOrderStatusSocket(orderId);
  const { currentOrder } = useOrderStore();
  const [orderDetails, setOrderDetails] = useState(null);
  const [billRequested, setBillRequested] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrderDetails(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (!orderDetails) return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center text-gray-400 font-sans">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Clock size={40} className="text-amber-500/50" />
      </motion.div>
      <p className="mt-4 text-sm uppercase tracking-widest text-gray-600">Loading status…</p>
    </div>
  );

  const activeStatus = currentOrder?.status || orderDetails.kot_status || orderDetails.status;
  const activeIndex = STATUS_STEPS.findIndex(s => s.key === activeStatus);

  const handleRequestBill = async () => {
    try {
      await api.post(`/orders/${orderId}/request-bill`);
      setBillRequested(true);
      alert('Bill requested! Admin will bring it to you shortly.');
    } catch (error) {
      alert('Failed to request bill.');
    }
  };

  // Ambient glow color per status
  const glowColors = {
    received:  'rgba(59,130,246,0.15)',
    accepted:  'rgba(168,85,247,0.15)',
    preparing: 'rgba(251,191,36,0.15)',
    ready:     'rgba(249,115,22,0.2)',
    served:    'rgba(34,197,94,0.15)',
  };
  const activeGlow = glowColors[activeStatus] || 'rgba(251,191,36,0.1)';

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-32 font-sans selection:bg-amber-900 text-gray-200">

      {/* Header */}
      <header className="sticky top-0 backdrop-blur-xl bg-[#0d0d0d]/80 border-b border-white/5 z-50 px-5 py-4 flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(`/menu/${orderDetails.table_id}`)}
          className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 border border-white/10 transition-all text-gray-300 hover:text-amber-500"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </motion.button>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Track Order
          </h1>
          <p className="text-xs text-amber-500/60 uppercase tracking-widest mt-0.5 font-medium">
            Order #{orderId}
          </p>
        </motion.div>
        <div className="w-10" />
      </header>

      <div className="px-5 pt-8 space-y-6 max-w-md mx-auto">

        {/* Live Status Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative rounded-3xl border border-white/10 overflow-hidden"
          style={{ background: `radial-gradient(ellipse at center, ${activeGlow} 0%, transparent 70%), #111` }}
        >
          <div className="px-6 py-8 text-center">
            {activeIndex >= 0 && (() => {
              const ActiveIcon = STATUS_STEPS[activeIndex].icon;
              return (
                <motion.div
                  key={activeStatus}
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
                    <ActiveIcon size={44} className="text-amber-500" strokeWidth={1.2} />
                  </div>
                  <h2 className="text-3xl font-serif font-black text-gray-100 tracking-wide mb-1">
                    {STATUS_STEPS[activeIndex].label}
                  </h2>
                  <p className="text-gray-400 text-sm font-medium">
                    {STATUS_STEPS[activeIndex].desc}
                  </p>
                </motion.div>
              );
            })()}
          </div>

          {/* Progress Bar */}
          <div className="px-6 pb-6">
            <div className="flex gap-1.5">
              {STATUS_STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.1 }}
                  className={`h-1.5 flex-1 rounded-full origin-left transition-all duration-700 ${
                    i <= activeIndex ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-2 uppercase tracking-widest px-0.5">
              <span>Placed</span>
              <span>Served</span>
            </div>
          </div>
        </motion.div>

        {/* Steps Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 p-6"
        >
          <h3 className="font-serif font-bold text-gray-400 text-xs uppercase tracking-widest mb-5">Kitchen Journey</h3>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= activeIndex;
              const isActive = index === activeIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex items-start gap-4 relative">
                  {/* Connecting Line */}
                  {index < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute left-[17px] top-9 w-[2px] h-[calc(100%+4px)] transition-all duration-700 ${
                        index < activeIndex ? 'bg-amber-500/50' : 'bg-white/5'
                      }`}
                    />
                  )}

                  {/* Icon Circle */}
                  <motion.div
                    animate={isActive ? { boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 15px rgba(251,191,36,0.4)', '0 0 0px rgba(251,191,36,0)'] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`relative w-9 h-9 rounded-full shrink-0 flex items-center justify-center z-10 border transition-all duration-500 ${
                      isCompleted
                        ? 'bg-amber-500/20 border-amber-500/50'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <StepIcon size={16} className={isCompleted ? 'text-amber-500' : 'text-gray-600'} strokeWidth={1.5} />
                  </motion.div>

                  {/* Text */}
                  <div className={`pb-7 transition-all duration-500 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-70' : 'opacity-25'}`}>
                    <h4 className={`font-bold text-base leading-tight ${isActive ? 'text-amber-400' : isCompleted ? 'text-gray-200' : 'text-gray-500'}`}>
                      {step.label}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 p-6"
        >
          <h3 className="font-serif font-bold text-gray-400 text-xs uppercase tracking-widest mb-5">Your Order</h3>
          <div className="space-y-3">
            {orderDetails.items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + idx * 0.05 }}
                className="flex justify-between items-center text-sm py-1"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-xs font-black shrink-0">
                    {item.quantity}
                  </span>
                  <span className="text-gray-300 font-medium">{item.name}</span>
                </div>
                <span className="font-black text-amber-500/90">₹{item.price * item.quantity}</span>
              </motion.div>
            ))}
          </div>
          <div className="border-t border-white/10 mt-5 pt-5 flex justify-between items-center">
            <span className="font-serif text-gray-400 tracking-wider text-sm">Total</span>
            <span className="text-2xl font-black text-amber-500">₹{orderDetails.total_amount}</span>
          </div>
        </motion.div>

      </div>

      {/* Bottom Sticky Footer */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur-xl border-t border-white/10 px-5 py-4 flex gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50"
      >
        <button
          onClick={() => navigate(`/menu/${orderDetails.table_id}`)}
          className="w-1/3 bg-white/5 border border-white/10 text-gray-300 font-bold py-4 rounded-xl text-sm flex items-center justify-center hover:bg-white/10 hover:text-white transition-all uppercase tracking-wider"
        >
          Menu
        </button>
        <AnimatePresence mode="wait">
          {billRequested ? (
            <motion.div
              key="requested"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex-1 bg-green-500/10 border border-green-500/30 text-green-400 font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Bill Requested!
            </motion.div>
          ) : (
            <motion.button
              key="request"
              whileTap={{ scale: 0.98 }}
              onClick={handleRequestBill}
              disabled={activeStatus !== 'served'}
              className={`flex-1 font-black py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${
                activeStatus !== 'served'
                  ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:scale-[1.02]'
              }`}
            >
              <Receipt size={16} /> Request Bill
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
};

export default OrderStatusPage;
