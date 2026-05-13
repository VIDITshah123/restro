import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useSessionStore, useOrderStore } from '../../store';
import api from '../../api';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, updateNotes, getTotal, clearCart } = useCartStore();
  const { tableId } = useSessionStore();
  const { setOrder } = useOrderStore();
  const [upsells, setUpsells] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    const fetchUpsells = async () => {
      if (items.length === 0) return;
      try {
        const itemIds = items.map(i => i.menuItemId).join(',');
        const res = await api.get(`/ai/frequently-with?items=${itemIds}`);
        
        // Fetch full details of suggested items
        const menuRes = await api.get('/menu');
        const suggested = menuRes.data.data.filter(m => res.data.suggestions.includes(m.id));
        setUpsells(suggested);
      } catch (err) {
        console.error('Error fetching upsells:', err);
      }
    };
    fetchUpsells();
  }, [items.length]);

  const placeOrder = async () => {
    if (!tableId || items.length === 0) return;
    if (!customerName.trim()) {
      alert('Please enter your name to place the order.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/orders', {
        tableId,
        customerName: customerName.trim(),
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          specialNotes: i.specialNotes,
          price: i.price,
          costPrice: i.cost_price
        }))
      });
      
      clearCart();
      setOrder(res.data.data.orderId, 'placed');
      navigate(`/order-status/${res.data.data.orderId}`);
    } catch (err) {
      alert('Error placing order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-6 text-center font-sans">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <ShoppingBag size={64} className="text-amber-500/30 mx-auto mb-6" strokeWidth={1} />
          <h2 className="text-2xl font-serif font-black mb-4 text-gray-200 tracking-wide">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
          <button onClick={() => navigate(-1)} className="bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold px-8 py-3 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 transition-transform">
            Back to Menu
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-40 font-sans selection:bg-amber-900 text-gray-200">
      <header className="bg-[#0d0d0d]/90 backdrop-blur-xl px-5 py-5 flex items-center border-b border-white/5 sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-amber-500 transition-colors"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-serif font-black ml-2 tracking-wide">Review Order</h1>
      </header>

      <div className="p-5 space-y-4">
        <AnimatePresence>
          {items.map((item, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}
              key={`${item.menuItemId}-${item.specialNotes || 'none'}`} 
              className="bg-white/5 p-4 rounded-2xl shadow-lg border border-white/5 backdrop-blur-sm relative overflow-hidden"
            >
              <div className="flex justify-between items-start relative z-10">
                <div className="flex-1 pr-4">
                  <h3 className="font-bold text-lg text-gray-100 leading-tight mb-1">{item.name}</h3>
                  {item.specialNotes && (
                    <p className="text-xs text-amber-500/80 font-medium mt-1 leading-snug">📝 {item.specialNotes}</p>
                  )}
                  <p className="font-black text-amber-500 mt-2 text-lg">₹{item.price * item.quantity}</p>
                </div>
                <div className="flex items-center gap-3 bg-[#111] rounded-xl px-2 py-1.5 border border-white/10 shadow-inner">
                  <button onClick={() => {
                    if (item.quantity === 1) {
                      removeItem(item.menuItemId, item.specialNotes);
                    } else {
                      updateQuantity(item.menuItemId, -1, item.specialNotes);
                    }
                  }} className="p-1 text-gray-400 hover:text-white transition-colors">
                    {item.quantity === 1 ? <Trash2 size={16} className="text-red-500/80 hover:text-red-500"/> : <Minus size={16}/>}
                  </button>
                  <span className="font-bold w-6 text-center text-gray-200">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menuItemId, 1, item.specialNotes)} className="p-1 text-gray-400 hover:text-amber-500 transition-colors"><Plus size={16}/></button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {upsells.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-10 mb-6">
            <h3 className="font-serif font-black text-gray-300 mb-4 tracking-wide text-lg">Add the perfect pair</h3>
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
              {upsells.map(u => (
                <div key={u.id} className="min-w-[160px] bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl p-4 shrink-0 shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-gray-200 truncate pr-2">{u.name}</h4>
                    <span className={`shrink-0 w-2 h-2 rounded-full ${u.is_veg ? 'bg-green-500' : 'bg-red-500'} mt-1`}></span>
                  </div>
                  <p className="text-sm font-black text-amber-500 mb-3">₹{u.price}</p>
                  <button 
                    onClick={() => {
                      const { addItem } = useCartStore.getState();
                      addItem({ menuItemId: u.id, name: u.name, price: u.price, is_veg: u.is_veg });
                    }}
                    className="w-full text-xs font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg py-2 transition-colors uppercase tracking-wider"
                  >
                    Add +
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur-xl border-t border-white/10 p-5 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">
        <div className="flex justify-between items-center mb-5">
          <span className="font-serif text-gray-400 tracking-wider">Grand Total</span>
          <span className="text-3xl font-black text-amber-500">₹{getTotal()}</span>
        </div>
        <div className="relative mb-4 group">
          <input 
            type="text" 
            placeholder="Your Name (Required)" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full text-base p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-medium placeholder:text-gray-600 text-gray-200"
          />
        </div>
        <button 
          onClick={placeOrder}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black py-4.5 rounded-xl text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          style={{ paddingTop: '1.125rem', paddingBottom: '1.125rem' }}
        >
          {isSubmitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </motion.div>
    </div>
  );
};

export default CartPage;
