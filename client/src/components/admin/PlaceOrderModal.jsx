import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShoppingBag, Bike, Utensils, Globe, Plus, Minus,
  Search, Check, Printer, AlertCircle, Sparkles, ChefHat
} from 'lucide-react';

const ONLINE_PLATFORMS = ['Zomato', 'Swiggy', 'MagicPin', 'Uber Eats', 'Direct Website', 'Other'];

// Helper to trigger thermal POS KOT print
const triggerThermalKotPrint = ({ orderNumber, kotNumber, tableNumber, items, orderType, notes }) => {
  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (!printWindow) {
    window.print();
    return;
  }

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const today = new Date().toLocaleDateString('en-GB');

  const itemsHtml = items.map(it => `
    <tr style="border-bottom: 1px dashed #ccc;">
      <td style="padding: 6px 0; font-weight: bold; font-size: 14px;">${it.name || it.item?.name}</td>
      <td style="padding: 6px 0; text-align: center; font-size: 14px; font-weight: 800;">${it.quantity}</td>
    </tr>
    ${it.selectedVariants && it.selectedVariants.length > 0 ? `
      <tr>
        <td colspan="2" style="font-size: 11px; color: #555; padding-bottom: 2px;">
          Add-ons: ${it.selectedVariants.map(v => v.name).join(', ')}
        </td>
      </tr>
    ` : ''}
    ${it.notes ? `
      <tr>
        <td colspan="2" style="font-size: 11px; color: #d97706; font-style: italic; padding-bottom: 4px;">
          Note: ${it.notes}
        </td>
      </tr>
    ` : ''}
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOT - ${tableNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            color: #000;
            font-size: 12px;
            padding: 8px 0;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin: 0; font-size: 20px;">KITCHEN ORDER TICKET</h2>
          <div class="bold" style="font-size: 16px; margin: 4px 0;">${tableNumber}</div>
          <div style="font-size: 11px;">Type: ${orderType.toUpperCase()} | Date: ${today} ${now}</div>
          ${orderNumber ? `<div style="font-size: 11px;">Order #${orderNumber}</div>` : ''}
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding: 4px 0;">ITEM</th>
              <th style="text-align: center; padding: 4px 0; width: 40px;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        ${notes ? `<div class="divider"></div><div style="font-size: 11px;"><strong>Order Note:</strong> ${notes}</div>` : ''}
        <div class="double-divider"></div>
        <div class="center" style="font-size: 10px;">-- CHEF COPY --</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const PlaceOrderModal = ({ isOpen, onClose, onOrderPlaced, defaultOrderType = 'takeaway', preselectedTableId = null }) => {
  const [orderType, setOrderType] = useState(defaultOrderType); // 'dine_in' | 'takeaway' | 'delivery'
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');

  // Online platform states (only relevant when placing direct takeaway/delivery, NOT table orders)
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
  
  // Cart items: keyed by cartKey = `${item.id}_${sortedVariantIds.join('-')}_${notes}`
  const [cart, setCart] = useState({});

  // Dish Customization Modal
  const [customizingItem, setCustomizingItem] = useState(null);
  const [customVariants, setCustomVariants] = useState([]); // Array of selected variant objects
  const [customNotes, setCustomNotes] = useState('');
  const [customQty, setCustomQty] = useState(1);

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

      if (preselectedTableId) {
        setSelectedTableId(preselectedTableId);
      } else {
        const firstFree = (tablesRes.data.data || []).find(t => t.status === 'free' || !t.is_occupied);
        if (firstFree) setSelectedTableId(firstFree.id);
        else if (tablesRes.data.data?.length > 0) setSelectedTableId(tablesRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load menu or tables:', err);
      setErrorMsg('Failed to load menu or tables data.');
    } finally {
      setLoading(false);
    }
  }, [preselectedTableId]);

  useEffect(() => {
    if (isOpen) {
      // If opened for a specific table from Tables section: lock to dine_in and disable online options
      if (preselectedTableId) {
        setOrderType('dine_in');
        setIsOnline(false);
        setSelectedTableId(preselectedTableId);
      } else {
        setOrderType(defaultOrderType);
      }
      fetchInitialData();
    }
  }, [isOpen, defaultOrderType, preselectedTableId, fetchInitialData]);

  const selectedTable = useMemo(() => {
    return tables.find(t => String(t.id) === String(selectedTableId));
  }, [tables, selectedTableId]);

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

  // Open customization modal
  const openCustomizer = (item) => {
    setCustomizingItem(item);
    setCustomVariants([]);
    setCustomNotes('');
    setCustomQty(1);
  };

  // Add customized item to cart
  const confirmCustomization = () => {
    if (!customizingItem) return;
    const addOnPrice = customVariants.reduce((sum, v) => sum + (v.price || 0), 0);
    const addOnCost = customVariants.reduce((sum, v) => sum + (v.cost_price || 0), 0);
    const finalPrice = customizingItem.price + addOnPrice;
    const finalCost = (customizingItem.cost_price || 0) + addOnCost;

    const variantIdKey = customVariants.map(v => v.id).sort().join('-');
    const cartKey = `${customizingItem.id}_${variantIdKey}_${customNotes.trim()}`;

    setCart(prev => {
      const current = prev[cartKey];
      const newQty = (current ? current.quantity : 0) + customQty;
      return {
        ...prev,
        [cartKey]: {
          key: cartKey,
          item: customizingItem,
          selectedVariants: customVariants,
          notes: customNotes.trim(),
          price: finalPrice,
          cost_price: finalCost,
          quantity: newQty
        }
      };
    });

    setCustomizingItem(null);
  };

  // Quick add (if item has no variants)
  const handleQuickAdd = (item) => {
    if (item.variants && item.variants.length > 0) {
      openCustomizer(item);
      return;
    }

    const cartKey = `${item.id}__`;
    setCart(prev => {
      const current = prev[cartKey] || {
        key: cartKey,
        item,
        selectedVariants: [],
        notes: '',
        price: item.price,
        cost_price: item.cost_price || 0,
        quantity: 0
      };
      return {
        ...prev,
        [cartKey]: {
          ...current,
          quantity: current.quantity + 1
        }
      };
    });
  };

  const handleUpdateQuantity = (cartKey, delta) => {
    setCart(prev => {
      const current = prev[cartKey];
      if (!current) return prev;
      const newQty = current.quantity + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[cartKey];
        return next;
      }
      return {
        ...prev,
        [cartKey]: { ...current, quantity: newQty }
      };
    });
  };

  const handleUpdateNotes = (cartKey, notes) => {
    setCart(prev => {
      if (!prev[cartKey]) return prev;
      return {
        ...prev,
        [cartKey]: { ...prev[cartKey], notes }
      };
    });
  };

  const cartList = Object.values(cart);
  const cartTotal = cartList.reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);

  // Submit order with printKot flag (Task 6)
  const handleOrderSubmission = async ({ printKot = false } = {}) => {
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
      if (isOnline && !preselectedTableId) {
        finalPlatform = platformPreset === 'Other' ? (customPlatformNote || 'Online') : platformPreset;
        if (customPlatformNote && platformPreset !== 'Other') {
          finalPlatform += ` (${customPlatformNote})`;
        }
      }

      const orderPayload = {
        tableId: orderType === 'dine_in' ? selectedTableId : null,
        orderType,
        isOnline: preselectedTableId ? false : isOnline,
        onlinePlatform: finalPlatform,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: cartList.map(entry => {
          let composedNotes = [];
          if (entry.selectedVariants && entry.selectedVariants.length > 0) {
            composedNotes.push(`Add-ons: ${entry.selectedVariants.map(v => v.name).join(', ')}`);
          }
          if (entry.notes) {
            composedNotes.push(entry.notes);
          }
          return {
            menuItemId: entry.item.id,
            quantity: entry.quantity,
            price: entry.price,
            costPrice: entry.cost_price || 0,
            specialNotes: composedNotes.join(' | ')
          };
        })
      };

      const res = await api.post('/orders', orderPayload);
      if (res.data.success) {
        const orderData = res.data.data;
        const targetTableName = selectedTable ? selectedTable.table_number : `Table ${selectedTableId}`;

        // If printKot is requested, trigger thermal KOT print
        if (printKot) {
          triggerThermalKotPrint({
            orderNumber: orderData?.order_number,
            kotNumber: orderData?.kot_number,
            tableNumber: orderType === 'dine_in' ? targetTableName : (orderType === 'takeaway' ? 'Takeaway' : 'Delivery'),
            items: cartList,
            orderType,
            notes: customerName ? `Customer: ${customerName}` : ''
          });
        }

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
          className="bg-[#0f0f0f] border border-amber-500/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-[#141414] border-b border-white/5 px-6 py-5 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h2 className="text-xl font-serif font-black text-white">
                  {preselectedTableId ? `Order for ${selectedTable?.table_number || `Table #${preselectedTableId}`}` : 'Create New Order'}
                </h2>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                {preselectedTableId
                  ? 'Table Dining Order (Takeaway & Online Options Hidden)'
                  : 'Admin Order Dispatch (Dine-in, Takeaway, Free Delivery)'}
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
                    placeholder="Search dishes or add-ons..."
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === 'All'
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat.name
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
                    const hasVariants = item.variants && item.variants.length > 0;
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-white/5 hover:border-white/10 bg-[#141414] transition-all flex items-center justify-between gap-3"
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
                          {hasVariants && (
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {item.variants.map(v => (
                                <span key={v.id} className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">
                                  {v.name} (+₹{v.price})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openCustomizer(item)}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Choose variants & add notes"
                          >
                            <Sparkles size={11} className="text-amber-400" />
                            {hasVariants ? 'Customize' : '+ Note'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(item)}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} /> Add
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right 5 cols: Order Configurations, Customer & Cart Summary */}
            <div className="lg:col-span-5 flex flex-col bg-[#0c0c0c] h-full overflow-hidden">
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                  {/* Task 4: Hide Takeaway, Delivery, Online Options when table is preselected */}
                  {preselectedTableId ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">
                          Table Order Only
                        </span>
                        <span className="text-base font-black text-gray-100">
                          {selectedTable?.table_number || `Table #${preselectedTableId}`}
                        </span>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider border border-amber-500/30">
                        Dine-In Locked
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Order Type Selection for non-table direct orders */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                          Order Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setOrderType('dine_in')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              orderType === 'dine_in'
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
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              orderType === 'takeaway'
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
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              orderType === 'delivery'
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                                : 'bg-[#141414] border-white/5 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <Bike size={18} />
                            <span className="text-xs font-bold">Free Delivery</span>
                          </button>
                        </div>
                      </div>

                      {/* If Dine-In and not preselected, show Table Picker */}
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
                                {t.table_number} ({t.status || 'free'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Online Platform Toggle (Only shown when not preselected from table) */}
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
                                  className={`py-1 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                    platformPreset === p
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
                              placeholder="Channel / Order ID (e.g. #9214)"
                              value={customPlatformNote}
                              onChange={e => setCustomPlatformNote(e.target.value)}
                              className="w-full bg-[#181818] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-blue-500/50"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Customer Information (Optional for dine-in, required for delivery) */}
                  <div className="bg-[#141414] border border-white/5 rounded-2xl p-3.5 space-y-2.5">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Customer Details {orderType === 'delivery' && <span className="text-amber-500">*</span>}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Guest Name"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:border-amber-500/50"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:border-amber-500/50"
                      />
                    </div>
                    {orderType === 'delivery' && (
                      <input
                        type="text"
                        placeholder="Complete Delivery Address *"
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        className="w-full bg-[#181818] border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:border-amber-500/50"
                      />
                    )}
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Order Items ({cartList.reduce((s, e) => s + e.quantity, 0)})
                      </span>
                      {cartList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCart({})}
                          className="text-[10px] text-red-400/80 hover:text-red-400 font-bold uppercase transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {cartList.length === 0 ? (
                      <div className="p-8 text-center bg-[#141414] border border-white/5 rounded-2xl text-gray-600 text-xs">
                        No dishes added to order yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {cartList.map(entry => (
                          <div
                            key={entry.key}
                            className="p-3 bg-[#141414] border border-white/5 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${entry.item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span className="text-xs font-bold text-gray-200 truncate">{entry.item.name}</span>
                                </div>
                                {entry.selectedVariants && entry.selectedVariants.length > 0 && (
                                  <div className="text-[10px] text-purple-400 font-medium pl-3.5">
                                    + {entry.selectedVariants.map(v => v.name).join(', ')}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center bg-[#1f1f1f] border border-white/10 rounded-lg p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(entry.key, -1)}
                                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <span className="w-5 text-center text-xs font-bold text-amber-400 font-mono">
                                    {entry.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(entry.key, 1)}
                                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                                <span className="text-xs font-mono font-bold text-gray-200 w-14 text-right">
                                  ₹{entry.price * entry.quantity}
                                </span>
                              </div>
                            </div>

                            {/* Task 3: Editable special note per item */}
                            <input
                              type="text"
                              placeholder="Special instruction (e.g. less oil, extra spicy)..."
                              value={entry.notes || ''}
                              onChange={e => handleUpdateNotes(entry.key, e.target.value)}
                              className="w-full bg-[#0d0d0d] border border-white/5 rounded-lg px-2.5 py-1 text-[11px] text-gray-300 placeholder-gray-600 outline-none focus:border-amber-500/40"
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

                {/* Task 6: Modal Footer with "Place Order & Hold Table" AND "Print KOT & Hold Table" */}
                <div className="p-4 border-t border-white/5 bg-[#121212] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-medium">Grand Total</span>
                    <span className="text-2xl font-black text-amber-500 font-mono">₹{cartTotal}</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Place Order & Hold Table */}
                    <button
                      type="button"
                      disabled={submitting || cartList.length === 0}
                      onClick={() => handleOrderSubmission({ printKot: false })}
                      className="flex-1 sm:flex-none py-2.5 px-4 bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10 font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} className="text-emerald-400" />
                      {orderType === 'dine_in' ? 'Place Order & Hold' : 'Place Order'}
                    </button>

                    {/* Print KOT & Hold Table (Task 6) */}
                    <button
                      type="button"
                      disabled={submitting || cartList.length === 0}
                      onClick={() => handleOrderSubmission({ printKot: true })}
                      className="flex-1 sm:flex-none py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} strokeWidth={2.5} />
                      Print KOT & Hold Table
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Dish Customization Pop-up Dialog (Task 3) */}
          <AnimatePresence>
            {customizingItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md z-60 flex items-center justify-center p-4"
                onClick={() => setCustomizingItem(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 15 }}
                  className="bg-[#141414] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${customizingItem.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                        <h3 className="font-serif font-black text-base text-gray-100">{customizingItem.name}</h3>
                      </div>
                      <p className="text-xs text-amber-500/80 font-mono mt-0.5">Base Price: ₹{customizingItem.price}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomizingItem(null)}
                      className="text-gray-500 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Variants / Add-ons Checklist */}
                  {customizingItem.variants && customizingItem.variants.length > 0 ? (
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                        Choose Variants & Add-ons
                      </label>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {customizingItem.variants.map(v => {
                          const isSelected = customVariants.some(cv => cv.id === v.id);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setCustomVariants(prev => {
                                  const exists = prev.some(cv => cv.id === v.id);
                                  return exists ? prev.filter(cv => cv.id !== v.id) : [...prev, v];
                                });
                              }}
                              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                                  : 'bg-[#1a1a1a] border-white/5 text-gray-300 hover:border-white/15'
                              }`}
                            >
                              <span className="font-medium">{v.name}</span>
                              <span className="font-mono font-bold text-amber-400">+₹{v.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No variants configured for this dish. You can add special instructions below.</p>
                  )}

                  {/* Special Note */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                      Special Note / Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Less spicy, no coriander, extra hot..."
                      value={customNotes}
                      onChange={e => setCustomNotes(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-amber-500/50"
                    />
                  </div>

                  {/* Quantity & Confirm */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-3">
                    <div className="flex items-center bg-[#1a1a1a] border border-white/10 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setCustomQty(q => Math.max(1, q - 1))}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-amber-400 font-mono">
                        {customQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomQty(q => q + 1)}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={confirmCustomization}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
                    >
                      Add (₹{(customizingItem.price + customVariants.reduce((s, v) => s + (v.price || 0), 0)) * customQty})
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlaceOrderModal;
