import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore, useCartStore } from '../../store';
import api from '../../api';
import { ShoppingCart, Receipt, X, CheckCircle, Plus, Minus, CreditCard, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MenuPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { tableNumber, setTable } = useSessionStore();
  const { items: cartItems, addItem } = useCartStore();
  
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [search, setSearch] = useState('');
  
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [customizingItem, setCustomizingItem] = useState(null);
  const [customOptions, setCustomOptions] = useState({ selectedVariantId: null, selectedVariantName: 'Base', selectedVariantPrice: null, vegType: 'Regular', noMushroom: false, text: '' });
  const [customQty, setCustomQty] = useState(1);
  const [showBillPopup, setShowBillPopup] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [billAmount, setBillAmount] = useState(0);
  const [billOrders, setBillOrders] = useState([]);

  const handleAddClick = (item) => {
    setCustomizingItem(item);
    setCustomOptions({ 
      selectedVariantId: null, 
      selectedVariantName: 'Base', 
      selectedVariantPrice: null, 
      vegType: 'Regular', 
      noMushroom: false, 
      text: '' 
    });
    setCustomQty(1);
  };

  const confirmAdd = () => {
    let notes = [];
    if (customOptions.selectedVariantName !== 'Base') notes.push(customOptions.selectedVariantName);
    if (customOptions.vegType && customOptions.vegType !== 'Regular') notes.push(customOptions.vegType);
    if (customOptions.noMushroom) notes.push('Without Mushroom');
    if (customOptions.text) notes.push(customOptions.text);
    
    const effectivePrice = customOptions.selectedVariantPrice ?? customizingItem.price;
    const effectiveName = customOptions.selectedVariantName !== 'Base'
      ? `${customizingItem.name} (${customOptions.selectedVariantName})`
      : customizingItem.name;

    addItem({ 
      menuItemId: customizingItem.id, 
      name: effectiveName, 
      price: effectivePrice, 
      is_veg: customizingItem.is_veg,
      specialNotes: notes.join(', '),
      quantity: customQty
    });
    setCustomizingItem(null);
    setCustomQty(1);
  };

  const handleBillRequest = async () => {
    try {
      const res = await api.get(`/billing/${tableId}`);
      setBillAmount(res.data.data.grandTotal || 0);
      setBillOrders(res.data.data.orders || []);
      setShowBillPopup(true);
      setBillRequested(false);
    } catch (err) {
      console.error(err);
      setBillAmount(0);
      setBillOrders([]);
      setShowBillPopup(true);
    }
  };

  const submitBillRequest = async () => {
    try {
      await api.post(`/billing/${tableId}/request`);
      setBillRequested(true);
      setTimeout(() => {
        setShowBillPopup(false);
        setBillRequested(false);
      }, 2000);
    } catch (err) {
      alert('Failed to request bill');
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const tableRes = await api.get(`/tables/${tableId}`);
        setTable(tableId, tableRes.data.data.table_number);
        
        const menuRes = await api.get('/menu');
        setMenu(menuRes.data.data);
        
        const catRes = await api.get('/menu/categories');
        setCategories(['All', ...catRes.data.data]);

        // Fetch AI trending
        const trendRes = await api.get('/ai/trending');
        setTrending(trendRes.data.trending);
        
        // Fetch AI recommendations based on session/cart
        const cartItemIds = cartItems.map(i => i.menuItemId);
        const recRes = await api.post('/ai/recommendations', { cartItemIds });
        setRecommendations(recRes.data.recommendations);
      } catch (err) {
        console.error('Error initializing menu:', err);
      }
    };
    init();
  }, [tableId]);

  const filteredMenu = menu.filter(item => {
    if (activeCategory !== 'All' && item.category !== activeCategory) return false;
    if (isVegOnly && item.is_veg === 0) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    // Sort logic: available items first, out-of-stock items last
    if (a.is_available === b.is_available) return 0;
    return a.is_available ? -1 : 1;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Menu</h1>
          <p className="text-sm text-gray-500">{tableNumber || 'Loading table...'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBillRequest} 
            className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <Receipt size={24} />
          </button>
          <button 
            onClick={() => navigate('/cart')} 
            className="relative p-2 bg-gray-100 rounded-full"
          >
            <ShoppingCart size={24} />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartItems.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="p-4 bg-white space-y-4">
        <input 
          type="text" 
          placeholder="Search dishes..." 
          className="w-full p-2 border rounded-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${activeCategory === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <label className="flex items-center space-x-2 shrink-0 ml-4">
            <input 
              type="checkbox" 
              checked={isVegOnly} 
              onChange={() => setIsVegOnly(!isVegOnly)}
              className="accent-green-600"
            />
            <span className="text-sm font-medium text-green-700">Veg Only</span>
          </label>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && !search && activeCategory === 'All' && (
        <div className="p-4">
          <h2 className="text-lg font-bold mb-3">Recommended For You</h2>
          <div className="flex overflow-x-auto space-x-4 pb-2">
            {menu.filter(m => recommendations.includes(m.id)).map(item => (
              <div key={item.id} className="min-w-[160px] bg-white rounded-xl shadow-sm p-3 border">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                  <span className={`w-3 h-3 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <p className="text-gray-500 mt-1">₹{item.price}</p>
                <button 
                  onClick={() => handleAddClick(item)}
                  className="w-full mt-2 bg-black text-white py-1 rounded-lg text-sm"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu List */}
      <div className="p-4 space-y-4">
        {filteredMenu.map(item => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={item.id} 
            className={`bg-white rounded-xl shadow-sm border p-4 flex gap-4 ${!item.is_available ? 'opacity-50 grayscale' : ''}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 border rounded-full flex items-center justify-center ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </span>
                <h3 className="font-bold text-lg">{item.name}</h3>
              </div>
              <p className="text-gray-500 text-sm mb-2">{item.description}</p>
              <p className="font-semibold">₹{item.price}</p>
            </div>
            <div className="flex flex-col items-end justify-between">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-lg" />
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded-lg"></div>
              )}
              <button 
                disabled={!item.is_available}
                onClick={() => handleAddClick(item)}
                className={`mt-2 font-medium px-6 py-1.5 rounded-lg border shadow-sm ${
                  !item.is_available
                    ? 'bg-gray-200 text-gray-500 border-gray-300'
                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                }`}
              >
                {!item.is_available ? 'OUT OF STOCK' : 'ADD'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Customization Modal */}
      {customizingItem && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl p-5 pb-safe">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{customizingItem.name}</h2>
                <p className="text-gray-500 text-sm">Customize your order</p>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="text-gray-400 p-1">✕</button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pb-4">
              {/* Price Variants from DB */}
              {customizingItem.variants && customizingItem.variants.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Choose Variant</h3>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <input type="radio" name="dbVariant" checked={customOptions.selectedVariantId === null}
                          onChange={() => setCustomOptions(p => ({ ...p, selectedVariantId: null, selectedVariantName: 'Base', selectedVariantPrice: null }))}
                          className="accent-black" />
                        <span className="text-sm font-medium">Base</span>
                      </div>
                      <span className="text-sm font-bold">₹{customizingItem.price}</span>
                    </label>
                    {customizingItem.variants.map(v => (
                      <label key={v.id} className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <input type="radio" name="dbVariant" checked={customOptions.selectedVariantId === v.id}
                            onChange={() => setCustomOptions(p => ({ ...p, selectedVariantId: v.id, selectedVariantName: v.name, selectedVariantPrice: v.price }))}
                            className="accent-black" />
                          <span className="text-sm font-medium">{v.name}</span>
                        </div>
                        {v.price > 0 && <span className="text-sm font-bold">₹{v.price}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Food Type Options based on tags */}
              {(() => {
                let tags = [];
                try {
                  tags = typeof customizingItem.tags === 'string' ? JSON.parse(customizingItem.tags) : (customizingItem.tags || []);
                } catch (e) {}
                
                if (!tags || tags.length === 0) return null;
                
                const options = ['Regular', ...tags];

                return (
                  <div>
                    <h3 className="font-semibold mb-2">Food Type</h3>
                    <div className="space-y-2">
                      {options.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
                          <input type="radio" name="vegType" checked={customOptions.vegType === opt} onChange={() => setCustomOptions(p => ({ ...p, vegType: opt }))} className="accent-black" />
                          <span className="text-sm font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Mushroom checkbox */}
              {customizingItem.name.toLowerCase().includes('mushroom') && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input type="checkbox" checked={customOptions.noMushroom} onChange={(e) => setCustomOptions(p => ({ ...p, noMushroom: e.target.checked }))} className="accent-black w-4 h-4" />
                    Without Mushroom
                  </label>
                </div>
              )}

              {/* Special Instructions */}
              <div>
                <h3 className="font-semibold mb-2">Special Instructions</h3>
                <textarea 
                  rows="2"
                  placeholder="Write any specific preferences here..."
                  value={customOptions.text}
                  onChange={(e) => setCustomOptions(p => ({ ...p, text: e.target.value }))}
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                ></textarea>
              </div>

              {/* Quantity Selector */}
              <div>
                <h3 className="font-semibold mb-2">Quantity</h3>
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2 border w-fit">
                  <button 
                    onClick={() => setCustomQty(q => Math.max(1, q - 1))} 
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    disabled={customQty <= 1}
                  >
                    <Minus size={20} className={customQty <= 1 ? 'text-gray-300' : 'text-gray-700'} />
                  </button>
                  <span className="font-bold text-lg w-8 text-center">{customQty}</span>
                  <button 
                    onClick={() => setCustomQty(q => q + 1)} 
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Plus size={20} className="text-gray-700" />
                  </button>
                </div>
              </div>
            </div>

            <button onClick={confirmAdd} className="w-full bg-black text-white font-bold py-3 rounded-xl mt-2">
              Add to Cart — ₹{((customOptions.selectedVariantPrice ?? customizingItem.price) * customQty).toFixed(0)}
            </button>
          </div>
        </div>
      )}

      {/* Bill Popup */}
      <AnimatePresence>
        {showBillPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[110] flex items-end sm:items-center justify-center"
            onClick={() => !billRequested && setShowBillPopup(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {billRequested ? (
                <div className="p-8 text-center">
                  <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-700">Bill Requested!</h3>
                  <p className="text-gray-500 mt-2">Your bill request has been sent to the admin.</p>
                  <p className="text-sm text-gray-400 mt-1">A waiter will bring the bill shortly.</p>
                </div>
              ) : (
                <>
                  <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                    <div>
                      <h2 className="text-xl font-bold">Your Bill</h2>
                      <p className="text-gray-500 text-sm">{tableNumber}</p>
                    </div>
                    <button onClick={() => setShowBillPopup(false)} className="text-gray-400 p-1 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>
                  
                  {billOrders.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-400 text-lg font-medium">No orders placed yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="px-6 py-4 space-y-4">
                        {billOrders.map(order => (
                          <div key={order.id} className="border rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600">
                              Order #{order.id} — {order.customer_name || 'Guest'}
                            </div>
                            <div className="divide-y">
                              {order.items.map(item => (
                                <div key={item.id} className="px-4 py-3 flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {item.quantity}x {item.name}
                                    </p>
                                    {item.special_notes && (
                                      <p className="text-xs text-orange-600 font-semibold mt-0.5">
                                        📝 {item.special_notes}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 ml-4">₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                            <div className="px-4 py-2 bg-gray-50 flex justify-between text-sm font-bold border-t">
                              <span>Subtotal</span>
                              <span>₹{order.total_amount}</span>
                            </div>
                          </div>
                        ))}

                        <div className="border-2 border-black rounded-xl px-6 py-4 flex justify-between items-center">
                          <span className="text-lg font-bold">Grand Total</span>
                          <span className="text-3xl font-black">₹{billAmount}</span>
                        </div>
                      </div>

                      <div className="sticky bottom-0 bg-white border-t px-6 py-4 space-y-3 pb-safe">
                        <button
                          onClick={() => {
                            alert('Online payment coming soon!');
                          }}
                          className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                        >
                          <CreditCard size={20} />
                          Pay Online
                        </button>
                        <button
                          onClick={submitBillRequest}
                          className="w-full bg-black text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
                        >
                          <FileText size={20} />
                          Request Bill
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
