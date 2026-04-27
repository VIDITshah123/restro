import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useSessionStore, useOrderStore } from '../../store';
import api from '../../api';
import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react';

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
          price: i.price
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <button onClick={() => navigate(-1)} className="bg-black text-white px-6 py-2 rounded-lg">
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft /></button>
        <h1 className="text-xl font-bold ml-2">Review Order</h1>
      </header>

      <div className="p-4 space-y-4">
        {items.map(item => (
          <div key={item.menuItemId} className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{item.name}</h3>
                <p className="font-semibold text-gray-600 mt-1">₹{item.price * item.quantity}</p>
              </div>
              <div className="flex items-center gap-3 bg-red-50 rounded-lg px-2 py-1 border border-red-100">
                <button onClick={() => updateQuantity(item.menuItemId, -1)} className="p-1">
                  {item.quantity === 1 ? <Trash2 size={16} className="text-red-500"/> : <Minus size={16}/>}
                </button>
                <span className="font-bold w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.menuItemId, 1)} className="p-1"><Plus size={16}/></button>
              </div>
            </div>
            <input 
              type="text" 
              placeholder="Add cooking instructions (e.g. Less spicy, Jain)" 
              value={item.specialNotes}
              onChange={(e) => updateNotes(item.menuItemId, e.target.value)}
              className="w-full mt-3 text-sm p-2 border rounded-md bg-gray-50"
            />
          </div>
        ))}

        {upsells.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-700 mb-3">Frequently ordered together</h3>
            <div className="flex overflow-x-auto space-x-3 pb-2">
              {upsells.map(u => (
                <div key={u.id} className="min-w-[140px] bg-white border rounded-lg p-3 shrink-0">
                  <h4 className="text-sm font-semibold truncate">{u.name}</h4>
                  <p className="text-xs text-gray-500 mb-2">₹{u.price}</p>
                  <button 
                    onClick={() => {
                      const { addItem } = useCartStore.getState();
                      addItem({ menuItemId: u.id, name: u.name, price: u.price, is_veg: u.is_veg });
                    }}
                    className="w-full text-xs font-bold text-red-500 border border-red-200 rounded py-1"
                  >
                    ADD
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-gray-600">Grand Total</span>
          <span className="text-2xl font-bold">₹{getTotal()}</span>
        </div>
        <input 
          type="text" 
          placeholder="Your Name (Required)" 
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full mb-3 text-sm p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
        />
        <button 
          onClick={placeOrder}
          disabled={isSubmitting}
          className="w-full bg-black text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
};

export default CartPage;
