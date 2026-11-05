import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShoppingBag, Bike, Utensils, Globe, Plus, Minus,
  Search, Check, MapPin, Phone, User, AlertCircle
} from 'lucide-react';

const ONLINE_PLATFORMS = ['Zomato', 'Swiggy', 'MagicPin', 'Uber Eats', 'Direct Website', 'Other'];

const PlaceOrderModal = ({ isOpen, onClose, onOrderPlaced, defaultOrderType = 'takeaway' }) => {
  const [orderType, setOrderType] = useState(defaultOrderType); // 'dine_in' | 'takeaway' | 'delivery'
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');

  // Online platform states
  const [isOnline, setIsOnline] = useState(false);
  const [platformPreset, setPlatformPreset] = useState('Zomato');
  const [customPlatformNote, setCustomPlatformNote] = useState('');

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Menu and Cart
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState({}); // { itemId: { item, quantity, notes } }

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [tablesRes, menuRes, catRes] = await Promise.all([
        api.get('/tables'),
        api.get('/menu'),
        api.get('/menu/categories')
      ]);
      setTables(tablesRes.data.data || []);
      setMenuItems(menuRes.data.data || []);
      setCategories(catRes.data.data || []);

      // If dine-in, pick first available table
      const firstFree = (tablesRes.data.data || []).find(t => !t.is_occupied);
      if (firstFree) setSelectedTableId(firstFree.id);
      else if (tablesRes.data.data?.length > 0) setSelectedTableId(tablesRes.data.data[0].id);
    } catch (err) {
      console.error('Failed to load menu or tables:', err);
      setErrorMsg('Failed to load menu or tables data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOrderType(defaultOrderType);
      fetchInitialData();
    }
  }, [isOpen, defaultOrderType, fetchInitialData]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item.is_available) return false;
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const handleAddToCart = (item) => {
    setCart(prev => {
      const current = prev[item.id] || { item, quantity: 0, notes: '', price: item.price };
      return {
        ...prev,
        [item.id]: {
          ...current,
          quantity: current.quantity + 1
        }
      };
    });
  };

  const handleUpdateQuantity = (itemId, delta) => {
    setCart(prev => {
      const current = prev[itemId];
      if (!current) return prev;
      const newQty = current.quantity + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...current, quantity: newQty }
      };
    });
  };

  const handleUpdateNotes = (itemId, notes) => {
    setCart(prev => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: { ...prev[itemId], notes }
      };
    });
  };

  const cartList = Object.values(cart);
  const cartTotal = cartList.reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (cartList.length === 0) {
      setErrorMsg('Please select at least one item.');
      return;
    }

    if (orderType === 'dine_in' && !selectedTableId) {
      setErrorMsg('Please select a dining table.');
      return;
    }

    if (orderType === 'delivery' && !customerAddress.trim()) {
      setErrorMsg('Please enter a delivery address for Free Home Delivery.');
      return;
    }

    setSubmitting(true);

    try {
      let finalPlatform = '';
      if (isOnline) {
        finalPlatform = platformPreset === 'Other' ? (customPlatformNote || 'Online') : platformPreset;
        if (customPlatformNote && platformPreset !== 'Other') {
          finalPlatform += ` (${customPlatformNote})`;
        }
      }

      const orderPayload = {
        tableId: orderType === 'dine_in' ? selectedTableId : null,
        orderType,
        isOnline,
        onlinePlatform: finalPlatform,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: cartList.map(entry => ({
          menuItemId: entry.item.id,
          quantity: entry.quantity,
          price: entry.price,
          costPrice: entry.item.cost_price || 0,
          specialNotes: entry.notes || ''
        }))
      };

      const res = await api.post('/orders', orderPayload);
      if (res.data.success) {
        setCart({});
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setIsOnline(false);
        setCustomPlatformNote('');
        if (onOrderPlaced) onOrderPlaced(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error('Order creation failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-[#0f0f0f] border border-amber-500/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-[#141414] border-b border-white/5 px-6 py-5 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h2 className="text-xl font-serif font-black text-white">Create New Order</h2>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                Admin Order Dispatch (Dine-in, Takeaway, Free Delivery)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body: Left menu list, Right order details & cart */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">

            {/* Left 7 cols: Menu browser */}
            <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-white/5 h-full overflow-hidden">

              {/* Search & Categories Bar */}
              <div className="p-4 border-b border-white/5 space-y-3 bg-[#0c0c0c]">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search menu dishes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#161616] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-amber-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${selectedCategory === 'All'
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                      }`}
                  >
                    All Items
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id || cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${selectedCategory === cat.name
                          ? 'bg-amber-500 text-black shadow-md'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dish List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                  <div className="py-20 text-center text-gray-500 animate-pulse text-sm">
                    Loading menu dishes...
                  </div>
                ) : filteredMenuItems.length === 0 ? (
                  <div className="py-20 text-center text-gray-600 text-sm">
                    No dishes found matching your search.
                  </div>
                ) : (
                  filteredMenuItems.map(item => {
                    const inCartQty = cart[item.id]?.quantity || 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${inCartQty > 0
                            ? 'bg-amber-500/10 border-amber-500/30 shadow-sm'
                            : 'bg-[#141414] border-white/5 hover:border-white/10'
                          }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                            <h4 className="font-bold text-sm text-gray-100 truncate">{item.name}</h4>
                            <span className="text-xs text-amber-500/80 font-mono font-bold">₹{item.price}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                          )}
                        </div>

                        {inCartQty > 0 ? (
                          <div className="flex items-center gap-2 bg-[#1f1f1f] border border-white/10 rounded-lg p-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-5 text-center text-xs font-black text-amber-500 font-mono">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} /> Add
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right 5 cols: Order Configurations, Customer & Cart Summary */}
            <div className="lg:col-span-5 flex flex-col bg-[#0c0c0c] h-full overflow-hidden">
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* 1. Order Type Selection */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      Order Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderType('dine_in')}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${orderType === 'dine_in'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                            : 'bg-[#141414] border-white/5 text-gray-400 hover:text-gray-200'
                          }`}
                      >
                        <Utensils size={18} />
                        <span className="text-xs font-bold">Dine-In</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrderType('takeaway')}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${orderType === 'takeaway'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                            : 'bg-[#141414] border-white/5 text-gray-400 hover:text-gray-200'
                          }`}
                      >
                        <ShoppingBag size={18} />
                        <span className="text-xs font-bold">Takeaway</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrderType('delivery')}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${orderType === 'delivery'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                            : 'bg-[#141414] border-white/5 text-gray-400 hover:text-gray-200'
                          }`}
                      >
                        <Bike size={18} />
                        <span className="text-xs font-bold">Free Delivery</span>
                      </button>
                    </div>
                  </div>

                  {/* If Dine-In, show Table Picker */}
                  {orderType === 'dine_in' && (
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                        Select Dining Table
                      </label>
                      <select
                        value={selectedTableId}
                        onChange={e => setSelectedTableId(e.target.value)}
                        className="w-full bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                      >
                        {tables.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.table_number} {t.is_occupied ? '(Occupied)' : '(Free)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 2. Online Platform Toggle */}
                  <div className="bg-[#141414] border border-white/5 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={16} className={isOnline ? 'text-blue-400' : 'text-gray-500'} />
                        <span className="text-xs font-bold text-gray-200">
                          Online Platform Order?
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOnline}
                          onChange={e => setIsOnline(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {isOnline && (
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <div className="grid grid-cols-3 gap-1.5">
                          {ONLINE_PLATFORMS.map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPlatformPreset(p)}
                              className={`py-1 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${platformPreset === p
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 font-bold'
                                  : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          placeholder={platformPreset === 'Other' ? "Enter platform name..." : "Optional: Order ID / Platform Note"}
                          value={customPlatformNote}
                          onChange={e => setCustomPlatformNote(e.target.value)}
                          className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Customer Info */}
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Customer Info {orderType === 'delivery' && <span className="text-amber-500">*</span>}
                    </label>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Customer Name"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          className="w-full bg-[#161616] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div className="relative flex-1">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          className="w-full bg-[#161616] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    {orderType === 'delivery' && (
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-3 text-amber-500" />
                        <textarea
                          placeholder="Delivery Address (Required for Free Home Delivery)..."
                          value={customerAddress}
                          onChange={e => setCustomerAddress(e.target.value)}
                          rows={2}
                          className="w-full bg-[#161616] border border-amber-500/30 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. Cart Items Summary */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Selected Items ({cartList.length})
                      </label>
                      {cartList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCart({})}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {cartList.length === 0 ? (
                      <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center text-gray-600 text-xs">
                        Select dishes from the menu on the left.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {cartList.map(entry => (
                          <div key={entry.item.id} className="bg-[#141414] border border-white/5 rounded-xl p-2.5 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-200 truncate flex items-center gap-1.5">
                                <span className="text-amber-500 font-mono">{entry.quantity}×</span>
                                {entry.item.name}
                              </span>
                              <span className="font-mono font-bold text-gray-300 shrink-0 ml-2">
                                ₹{entry.price * entry.quantity}
                              </span>
                            </div>
                            <input
                              type="text"
                              placeholder="Special instructions (e.g. extra spicy)..."
                              value={entry.notes || ''}
                              onChange={e => handleUpdateNotes(entry.item.id, e.target.value)}
                              className="w-full bg-[#0d0d0d] border border-white/5 rounded-lg px-2 py-1 text-[11px] text-gray-300 placeholder-gray-600 outline-none focus:border-amber-500/40"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                </div>

                {/* Footer Total & Place Order Button */}
                <div className="p-4 border-t border-white/5 bg-[#121212] flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-medium">Grand Total</span>
                    <span className="text-2xl font-black text-amber-500 font-mono">₹{cartTotal}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || cartList.length === 0}
                    className="flex-1 py-3 px-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Placing Order...' : (
                      <>
                        <Check size={16} strokeWidth={2.5} />
                        Place {orderType === 'takeaway' ? 'Takeaway' : orderType === 'delivery' ? 'Delivery' : 'Dine-In'} Order
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlaceOrderModal;
