import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore, useCartStore } from '../../store';
import api from '../../api';
import { ShoppingCart, Receipt, X, CheckCircle, Plus, Minus, CreditCard, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

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

  useEffect(() => {
    if (!showBillPopup || !tableId) return;

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/customer`);
    socket.emit('join:table', { tableId });

    socket.on('kot:statusUpdate', ({ orderId, newStatus }) => {
      setBillOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, kot_status: newStatus }
          : order
      ));
    });

    return () => socket.disconnect();
  }, [showBillPopup, tableId]);

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
    <div className="min-h-screen bg-[#0d0d0d] pb-20 font-sans selection:bg-amber-900 selection:text-amber-100 text-gray-200">
      {/* Header (Glassmorphism) */}
      <header className="sticky top-0 backdrop-blur-xl bg-[#0d0d0d]/80 border-b border-white/5 shadow-md z-50 px-5 py-4 flex justify-between items-center transition-all duration-500">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">Byte Cafe</h1>
          <p className="text-xs font-medium text-amber-500/70 uppercase tracking-widest mt-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            Table {tableNumber || '...'}
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-3">
          <button
            onClick={handleBillRequest}
            className="relative p-2.5 bg-white/5 rounded-full hover:bg-white/10 border border-white/10 transition-all text-gray-300 hover:text-amber-400"
          >
            <Receipt size={22} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => navigate('/cart')}
            className="relative p-2.5 bg-amber-500/10 rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition-all text-amber-500"
          >
            <ShoppingCart size={22} strokeWidth={1.5} />
            {cartItems.length > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
              >
                {cartItems.length}
              </motion.span>
            )}
          </button>
        </motion.div>
      </header>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="px-5 py-6 space-y-5 relative z-10">
        <div className="relative group">
          <input
            type="text"
            placeholder="Search your cravings..."
            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl shadow-inner focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all outline-none font-medium placeholder:font-normal placeholder:text-gray-500 text-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-4 top-4 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide pt-1 w-full">
            {categories.map((cat, idx) => (
              <motion.button
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + (idx * 0.05) }}
                whileTap={{ scale: 0.95 }}
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-sm
                  ${activeCategory === cat ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] transform -translate-y-0.5 border border-transparent' : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/30 hover:text-gray-200'}`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
          <motion.label initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center space-x-2 shrink-0 ml-4 p-2 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={isVegOnly}
              onChange={() => setIsVegOnly(!isVegOnly)}
              className="accent-green-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-semibold text-green-500 tracking-wide">VEG</span>
          </motion.label>
        </div>
      </motion.div>

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
      <div className="px-5 space-y-12">
        {categories.filter(c => c !== 'All').map((category, catIdx) => {
          const items = filteredMenu.filter(m => m.category === category);
          if (items.length === 0) return null;

          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (catIdx * 0.1) }} key={category} className="scroll-mt-28" id={`cat-${category}`}>
              <h2 className="text-2xl font-serif font-black mb-6 text-gray-100 tracking-wide flex items-center gap-4">
                {category}
                <div className="h-[1px] bg-gradient-to-r from-white/20 to-transparent flex-1 mt-1"></div>
              </h2>
              <div className="space-y-4">
                {items.map((item, itemIdx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (itemIdx * 0.05) }}
                    whileHover={{ scale: 1.01, borderColor: "rgba(251,191,36,0.3)" }}
                    whileTap={{ scale: 0.99 }}
                    key={item.id}
                    className={`bg-white/5 backdrop-blur-md rounded-2xl shadow-xl border border-white/5 p-4 flex gap-4 transition-all duration-300 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.5)] ${!item.is_available ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center ${item.is_veg ? 'border-green-500' : 'border-red-500'} bg-black/50`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </span>
                        <h3 className="font-bold text-lg text-gray-100 leading-tight">{item.name}</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">{item.description}</p>
                      <p className="font-black text-amber-500 text-lg tracking-tight">₹{item.price}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between min-w-[110px]">
                      {item.image_url ? (
                        <div className="relative w-28 h-28 rounded-xl overflow-hidden shadow-md border border-white/10 group">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                        </div>
                      ) : (
                        <div className="w-28 h-28 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center shadow-inner">
                          <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">No Image</span>
                        </div>
                      )}
                      <button
                        disabled={!item.is_available}
                        onClick={() => handleAddClick(item)}
                        className={`mt-[-18px] relative z-20 font-bold px-7 py-2.5 rounded-xl border shadow-lg uppercase tracking-wider text-xs transition-all duration-300 ${!item.is_available
                            ? 'bg-[#1a1a1a] text-gray-500 border-gray-800'
                            : 'bg-gradient-to-b from-[#222] to-[#111] text-amber-500 border-amber-500/30 hover:border-amber-500/80 hover:shadow-[0_0_15px_rgba(251,191,36,0.2)] active:scale-95'
                          }`}
                      >
                        {!item.is_available ? 'Sold Out' : 'Add +'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
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
              className="bg-[#0f0f0f] text-gray-200 w-full sm:w-[460px] sm:rounded-3xl rounded-t-3xl p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h2 className="text-2xl font-serif font-black text-gray-100 tracking-wide">{customizingItem.name}</h2>
                  <p className="text-amber-500/80 text-sm font-medium mt-1 uppercase tracking-widest">Customize your order</p>
                </div>
                <button onClick={() => setCustomizingItem(null)} className="text-gray-500 hover:text-amber-500 bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors border border-transparent hover:border-amber-500/30">✕</button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-2 scrollbar-hide pb-4 flex-1">
                {/* Add-ons from DB */}
                {customizingItem.variants && customizingItem.variants.length > 0 && (
                  <div>
                    <h3 className="font-serif font-bold text-gray-300 tracking-wider mb-3 uppercase text-sm">Add-ons</h3>
                    <div className="space-y-2">
                      {customizingItem.variants.map(v => {
                        const isSelected = customOptions.selectedVariants.some(sv => sv.id === v.id);
                        return (
                          <label key={v.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}>
                            <div className="flex items-center gap-3">
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
                                className="accent-amber-500 w-4 h-4 rounded"
                              />
                              <span className="text-sm font-medium text-gray-200">{v.name}</span>
                            </div>
                            {v.price !== 0 && (
                              <span className="text-sm font-black text-amber-500">
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
                  } catch (e) { }

                  if (!tags || tags.length === 0) return null;

                  const options = ['Regular', ...tags];

                  return (
                    <div>
                      <h3 className="font-serif font-bold text-gray-300 tracking-wider mb-3 uppercase text-sm mt-6">Food Type</h3>
                      <div className="space-y-2">
                        {options.map(opt => (
                          <label key={opt} className={`flex items-center gap-3 cursor-pointer p-3 border rounded-xl transition-all ${customOptions.vegType === opt ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}>
                            <input type="radio" name="vegType" checked={customOptions.vegType === opt} onChange={() => setCustomOptions(p => ({ ...p, vegType: opt }))} className="accent-amber-500 w-4 h-4" />
                            <span className="text-sm font-medium text-gray-200">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Mushroom checkbox */}
                {customizingItem.name.toLowerCase().includes('mushroom') && (
                  <div className="mt-6">
                    <label className="flex items-center gap-3 cursor-pointer p-3 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                      <input type="checkbox" checked={customOptions.noMushroom} onChange={(e) => setCustomOptions(p => ({ ...p, noMushroom: e.target.checked }))} className="accent-amber-500 w-4 h-4" />
                      <span className="text-sm font-medium text-gray-200">Without Mushroom</span>
                    </label>
                  </div>
                )}

                {/* Special Instructions */}
                <div className="mt-6">
                  <h3 className="font-serif font-bold text-gray-300 tracking-wider mb-3 uppercase text-sm">Special Instructions</h3>
                  <textarea
                    rows="2"
                    placeholder="Write any specific preferences here..."
                    value={customOptions.text}
                    onChange={(e) => setCustomOptions(p => ({ ...p, text: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-gray-200 placeholder:text-gray-600"
                  ></textarea>
                </div>

                {/* Quantity Selector */}
                <div className="mt-6">
                  <h3 className="font-serif font-bold text-gray-300 tracking-wider mb-3 uppercase text-sm">Quantity</h3>
                  <div className="flex items-center gap-4 bg-[#111] rounded-2xl p-2 border border-white/10 w-fit shadow-inner">
                    <button
                      onClick={() => setCustomQty(q => Math.max(1, q - 1))}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
                      disabled={customQty <= 1}
                    >
                      <Minus size={20} className={customQty <= 1 ? 'text-gray-600' : 'text-amber-500'} />
                    </button>
                    <span className="font-black text-2xl w-10 text-center text-gray-100">{customQty}</span>
                    <button
                      onClick={() => setCustomQty(q => q + 1)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
                    >
                      <Plus size={20} className="text-amber-500" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-2 shrink-0 border-t border-white/10">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmAdd}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black py-4.5 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all flex justify-between items-center px-7 text-lg tracking-wide uppercase"
                  style={{ paddingTop: '1.125rem', paddingBottom: '1.125rem' }}
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
            className="fixed inset-0 bg-black/70 z-[110] flex items-end sm:items-center justify-center backdrop-blur-sm"
            onClick={() => !billRequested && setShowBillPopup(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-[#0f0f0f] text-gray-200 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] max-h-[85vh] overflow-y-auto scrollbar-hide"
              onClick={e => e.stopPropagation()}
            >
              {billRequested ? (
                <div className="p-10 text-center">
                  <CheckCircle size={64} className="text-amber-500 mx-auto mb-5" />
                  <h3 className="text-2xl font-serif font-black text-amber-500 tracking-wide">Bill Requested!</h3>
                  <p className="text-gray-400 mt-3 text-sm">Your bill request has been sent to the admin.</p>
                  <p className="text-xs text-gray-500 mt-2">A waiter will bring the bill shortly.</p>
                </div>
              ) : (
                <>
                  <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex justify-between items-center z-10">
                    <div>
                      <h2 className="text-xl font-serif font-black tracking-wide text-gray-100">Your Bill</h2>
                      <p className="text-amber-500 text-xs mt-1 uppercase tracking-widest font-bold">{tableNumber}</p>
                    </div>
                    <button onClick={() => setShowBillPopup(false)} className="text-gray-500 hover:text-amber-500 bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors border border-transparent hover:border-amber-500/30">
                      <X size={20} />
                    </button>
                  </div>

                  {billOrders.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-gray-500 text-lg font-serif italic">No orders placed yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="px-6 py-5 space-y-5">
                        {billOrders.map(order => (
                          <div key={order.id} className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
                            <div className="bg-black/40 px-5 py-3 flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                              <span>Order #{order.id} — {order.customer_name || 'Guest'}</span>
                              {(() => {
                                const status = order.kot_status || order.status;
                                if (!status) return null;
                                const statusMap = {
                                  placed: { text: 'Placed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                                  received: { text: 'In Kitchen', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                                  preparing: { text: 'Preparing', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                                  ready: { text: 'Ready', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                                  served: { text: 'Served', color: 'bg-green-500/10 text-green-400 border-green-500/20' }
                                };
                                const badge = statusMap[status] || { text: status.toUpperCase(), color: 'bg-white/10 text-gray-300 border-white/20' };
                                return (
                                  <span className={`px-2 py-0.5 rounded text-[10px] tracking-wider font-black border ${badge.color}`}>
                                    {badge.text}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="divide-y divide-white/5">
                              {order.items.map(item => (
                                <div key={item.id} className="px-5 py-3.5 flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-200">
                                      <span className="text-amber-500 mr-1">{item.quantity}x</span> {item.name}
                                    </p>
                                    {item.special_notes && (
                                      <p className="text-xs text-amber-500/60 font-medium mt-1">
                                        📝 {item.special_notes}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-sm font-black text-gray-300 ml-4">₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                            <div className="px-5 py-3 bg-black/40 flex justify-between text-sm font-bold border-t border-white/5">
                              <span className="text-gray-400">Subtotal</span>
                              <span className="text-amber-500">₹{order.total_amount}</span>
                            </div>
                          </div>
                        ))}

                        <div className="border-t-2 border-white/10 rounded-xl px-2 mt-6 pt-6 flex justify-between items-center">
                          <span className="text-lg font-serif text-gray-300 tracking-wider">Grand Total</span>
                          <span className="text-3xl font-black text-amber-500">₹{billAmount}</span>
                        </div>
                      </div>

                      <div className="sticky bottom-0 bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/10 px-6 py-5 space-y-3 pb-safe z-10">
                        <button
                          onClick={() => {
                            alert('Online payment coming soon!');
                          }}
                          className="w-full bg-white/5 border border-white/10 text-gray-300 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white transition-colors uppercase tracking-wider text-sm"
                        >
                          <CreditCard size={18} />
                          Pay Online
                        </button>
                        <button
                          onClick={submitBillRequest}
                          className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] transition-all uppercase tracking-wider text-sm"
                        >
                          <FileText size={18} />
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
