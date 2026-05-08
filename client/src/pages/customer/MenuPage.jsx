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
  const [customOptions, setCustomOptions] = useState({ selectedVariants: [], vegType: 'Regular', noMushroom: false, text: '' });
  const [customQty, setCustomQty] = useState(1);
  const [showBillPopup, setShowBillPopup] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [billAmount, setBillAmount] = useState(0);
  const [billOrders, setBillOrders] = useState([]);

  const handleAddClick = (item) => {
    setCustomizingItem(item);
    setCustomOptions({ 
      selectedVariants: [],
      vegType: 'Regular', 
      noMushroom: false, 
      text: '' 
    });
    setCustomQty(1);
  };

  const confirmAdd = () => {
    let notes = [];
    if (customOptions.selectedVariants.length > 0) {
      notes.push(customOptions.selectedVariants.map(v => v.name).join(' + '));
    }
    if (customOptions.vegType && customOptions.vegType !== 'Regular') notes.push(customOptions.vegType);
    if (customOptions.noMushroom) notes.push('Without Mushroom');
    if (customOptions.text) notes.push(customOptions.text);
    
    const addonsPrice = customOptions.selectedVariants.reduce((sum, v) => sum + v.price, 0);
    const effectivePrice = customizingItem.price + addonsPrice;

    addItem({ 
      menuItemId: customizingItem.id, 
      name: customizingItem.name, 
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
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans selection:bg-orange-200">
      {/* Header (Glassmorphism) */}
      <header className="sticky top-0 backdrop-blur-xl bg-white/80 border-b border-gray-100 shadow-sm z-50 px-5 py-4 flex justify-between items-center transition-all duration-300">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">Menu</h1>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Table {tableNumber || '...'}
          </p>
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
      <div className="px-5 py-4 space-y-4 relative z-10">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search your cravings..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none font-medium placeholder:font-normal"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide pt-1">
            {categories.map(cat => (
              <motion.button 
                whileTap={{ scale: 0.95 }}
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm
                  ${activeCategory === cat ? 'bg-black text-white shadow-md transform -translate-y-0.5' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
              >
                {cat}
              </motion.button>
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
        <div className="px-5 pt-2 pb-6">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2">
            <span className="text-xl">✨</span> Top Picks For You
          </h2>
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
            {menu.filter(m => recommendations.includes(m.id) && (!isVegOnly || m.is_veg !== 0)).map(item => (
              <motion.div 
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                key={item.id} 
                className="min-w-[180px] bg-gradient-to-br from-amber-50 to-orange-50/30 rounded-2xl shadow-sm p-4 border border-amber-100/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight pr-2">{item.name}</h3>
                    <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'} shadow-sm mt-1`}></span>
                  </div>
                  <p className="text-gray-600 font-bold">₹{item.price}</p>
                </div>
                <button 
                  onClick={() => handleAddClick(item)}
                  className="w-full mt-4 bg-white text-black border border-gray-200 py-2 rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:border-black transition-all"
                >
                  Add to Cart
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Menu List */}
      <div className="px-5 space-y-8">
        {categories.filter(c => c !== 'All').map(category => {
          const items = filteredMenu.filter(m => m.category === category);
          if (items.length === 0) return null;
          
          return (
            <div key={category} className="scroll-mt-24" id={`cat-${category}`}>
              <h2 className="text-2xl font-black mb-5 text-gray-900 tracking-tight flex items-center gap-3">
                {category}
                <div className="h-px bg-gray-200 flex-1 mt-1"></div>
              </h2>
              <div className="space-y-4">
                {items.map(item => (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.2 }}
                    key={item.id} 
                    className={`bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-4 flex gap-4 transition-all hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] ${!item.is_available ? 'opacity-60 grayscale' : ''}`}
                  >
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center ${item.is_veg ? 'border-green-600' : 'border-red-600'} bg-white`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        </span>
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.name}</h3>
                      </div>
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2 leading-relaxed">{item.description}</p>
                      <p className="font-black text-gray-900 text-lg tracking-tight">₹{item.price}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between min-w-[100px]">
                      {item.image_url ? (
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-100 flex items-center justify-center shadow-inner">
                          <span className="text-gray-300 text-xs font-bold uppercase tracking-widest">No Image</span>
                        </div>
                      )}
                      <button 
                        disabled={!item.is_available}
                        onClick={() => handleAddClick(item)}
                        className={`mt-[-16px] relative z-10 font-bold px-6 py-2 rounded-xl border-2 shadow-sm uppercase tracking-wide text-xs transition-all ${
                          !item.is_available
                            ? 'bg-gray-100 text-gray-400 border-gray-200'
                            : 'bg-white text-green-600 border-green-600 hover:bg-green-50 hover:shadow-md active:bg-green-100'
                        }`}
                      >
                        {!item.is_available ? 'Sold Out' : 'Add'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customization Modal */}
      <AnimatePresence>
      {customizingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white w-full sm:w-[460px] sm:rounded-3xl rounded-t-3xl p-6 pb-8 shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{customizingItem.name}</h2>
                <p className="text-gray-500 text-sm font-medium mt-1">Customize your order</p>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="text-gray-400 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors">✕</button>
            </div>
            
            <div className="space-y-6 overflow-y-auto pr-2 scrollbar-hide pb-4 flex-1">
              {/* Add-ons from DB */}
              {customizingItem.variants && customizingItem.variants.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Add-ons</h3>
                  <div className="space-y-2">
                    {customizingItem.variants.map(v => {
                      const isSelected = customOptions.selectedVariants.some(sv => sv.id === v.id);
                      return (
                        <label key={v.id} className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => {
                                setCustomOptions(p => {
                                  const exists = p.selectedVariants.some(sv => sv.id === v.id);
                                  return { 
                                    ...p, 
                                    selectedVariants: exists ? p.selectedVariants.filter(sv => sv.id !== v.id) : [...p.selectedVariants, v] 
                                  };
                                });
                              }}
                              className="accent-black w-4 h-4 rounded" 
                            />
                            <span className="text-sm font-medium">{v.name}</span>
                          </div>
                          {v.price !== 0 && (
                            <span className="text-sm font-bold text-gray-600">
                              {v.price > 0 ? `+₹${v.price}` : `-₹${Math.abs(v.price)}`}
                            </span>
                          )}
                        </label>
                      );
                    })}
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
                <h3 className="font-bold text-gray-900 mb-3">Quantity</h3>
                <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-2 border border-gray-100 w-fit">
                  <button 
                    onClick={() => setCustomQty(q => Math.max(1, q - 1))} 
                    className="p-3 bg-white hover:bg-gray-100 rounded-xl shadow-sm transition-all border border-gray-100"
                    disabled={customQty <= 1}
                  >
                    <Minus size={20} className={customQty <= 1 ? 'text-gray-300' : 'text-black'} />
                  </button>
                  <span className="font-black text-2xl w-10 text-center text-gray-900">{customQty}</span>
                  <button 
                    onClick={() => setCustomQty(q => q + 1)} 
                    className="p-3 bg-white hover:bg-gray-100 rounded-xl shadow-sm transition-all border border-gray-100"
                  >
                    <Plus size={20} className="text-black" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 shrink-0 border-t border-gray-100">
              <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={confirmAdd} 
                className="w-full bg-black text-white font-bold py-4 rounded-2xl shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] transition-all flex justify-between items-center px-6 text-lg tracking-wide"
              >
                <span>Add to Cart</span>
                {(() => {
                  const addonsPrice = customOptions.selectedVariants.reduce((sum, v) => sum + v.price, 0);
                  const effectivePrice = customizingItem.price + addonsPrice;
                  return <span>₹{(effectivePrice * customQty).toFixed(0)}</span>;
                })()}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

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
