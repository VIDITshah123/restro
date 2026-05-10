import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api';
import { Upload, X, Image as ImageIcon, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const MenuManagementPage = () => {
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [draggedCatIndex, setDraggedCatIndex] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [variantPanelItem, setVariantPanelItem] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantForm, setVariantForm] = useState({ name: '', price: '', cost_price: '' });
  const [sortOption, setSortOption] = useState('Default');
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  // comboSelections: { [menuItemId]: { selected: bool, variantIds: Set<number> } }
  const [comboSelections, setComboSelections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    category: '',
    image_url: '',
    is_veg: 1,
    is_available: 1,
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);

  const fetchMenu = async () => {
    try {
      const res = await api.get('/menu');
      setMenu(res.data.data);
      const catRes = await api.get('/menu/categories');
      setCategories(catRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const toggleAvailability = async (id, currentStatus) => {
    try {
      await api.patch(`/menu/${id}/availability`, { is_available: currentStatus ? 0 : 1 });
      fetchMenu();
    } catch (err) {
      alert('Error updating availability');
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().replace(',', '');
      if (newTag && !formData.tags.includes(newTag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  // Build description + cost from comboSelections
  const buildComboState = (selections, menuList) => {
    const lines = [];
    let totalCost = 0;
    for (const [itemId, sel] of Object.entries(selections)) {
      if (!sel.selected) continue;
      const mi = menuList.find(m => m.id === parseInt(itemId));
      if (!mi) continue;
      totalCost += parseFloat(mi.cost_price) || 0;
      const selectedVariants = mi.variants?.filter(v => sel.variantIds.has(v.id)) || [];
      if (selectedVariants.length === 0) {
        lines.push(`- 1x ${mi.name}`);
      } else {
        const varNames = selectedVariants.map(v => v.name).join(' & ');
        totalCost += selectedVariants.reduce((s, v) => s + (parseFloat(v.cost_price) || 0), 0);
        lines.push(`- 1x ${mi.name} (${varNames})`);
      }
    }
    return { description: lines.join('\n'), cost_price: totalCost };
  };

  // Parse an existing description into comboSelections
  const parseDescriptionToSelections = (description, menuList) => {
    const selections = {};
    const lines = (description || '').split('\n').map(l => l.trim()).filter(l => l.startsWith('- '));
    for (const line of lines) {
      // Match: - 1x ItemName (Addon1 & Addon2) or - 1x ItemName
      const match = line.match(/^- 1x (.+?)(?:\s*\((.+)\))?$/);
      if (!match) continue;
      const [, itemName, variantStr] = match;
      const mi = menuList.find(m => m.name === itemName);
      if (!mi) continue;
      const variantNames = variantStr ? variantStr.split(' & ').map(s => s.trim()) : [];
      const variantIds = new Set(
        (mi.variants || []).filter(v => variantNames.includes(v.name)).map(v => v.id)
      );
      selections[mi.id] = { selected: true, variantIds };
    }
    return selections;
  };

  const handleOpenModal = (item = null, isCombo = false) => {
    const isEditingCombo = item && item.category === 'Combo Meals';
    const willShowCombo = isCombo || isEditingCombo;
    setShowComboBuilder(willShowCombo);
    if (item) {
      setEditingItem(item);
      const parsed = {
        name: item.name,
        description: item.description || '',
        price: item.price,
        cost_price: item.cost_price || '',
        category: item.category,
        image_url: item.image_url || '',
        is_veg: item.is_veg,
        is_available: item.is_available,
        tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : []
      };
      setFormData(parsed);
      setImagePreview(item.image_url || null);
      if (willShowCombo) {
        setComboSelections(parseDescriptionToSelections(item.description || '', menu));
      }
    } else {
      setEditingItem(null);
      setFormData({
        name: '', description: '', price: '', cost_price: '', category: isCombo ? 'Combo Meals' : '', image_url: '', is_veg: 1, is_available: 1, tags: []
      });
      setImagePreview(null);
      setComboSelections({});
    }
    setImageFile(null);
    setTagInput('');
    setIsModalOpen(true);
  };

  const handleImageSelect = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setFormData(prev => ({ ...prev, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  }, []);

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...formData, tags: JSON.stringify(formData.tags) };
    try {
      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, payload);
      } else {
        await api.post('/menu', payload);
      }
      setIsModalOpen(false);
      setImageFile(null);
      setImagePreview(null);
      fetchMenu();
    } catch (err) {
      alert('Error saving menu item');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/menu/${id}`);
      fetchMenu();
    } catch (err) {
      alert('Error deleting item');
    }
  };

  const openVariantPanel = async (item) => {
    setVariantPanelItem(item);
    setVariantForm({ name: '', price: '', cost_price: '' });
    const res = await api.get(`/menu/${item.id}/variants`);
    setVariants(res.data.data);
  };

  const addVariant = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/menu/${variantPanelItem.id}/variants`, variantForm);
      const res = await api.get(`/menu/${variantPanelItem.id}/variants`);
      setVariants(res.data.data);
      setVariantForm({ name: '', price: '', cost_price: '' });
    } catch (err) {
      alert('Error adding variant');
    }
  };

  const deleteVariant = async (variantId) => {
    try {
      await api.delete(`/menu/${variantPanelItem.id}/variants/${variantId}`);
      setVariants(prev => prev.filter(v => v.id !== variantId));
    } catch (err) {
      alert('Error deleting variant');
    }
  };

  const filteredMenu = menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === '' || item.category === filterCategory;
    const matchesType = filterType === 'All' 
                        ? true 
                        : filterType === 'Veg' ? item.is_veg === 1 : item.is_veg === 0;
    return matchesSearch && matchesCategory && matchesType;
  });

  const sortedMenu = [...filteredMenu].sort((a, b) => {
    if (sortOption === 'Price (Low to High)') return a.price - b.price;
    if (sortOption === 'Price (High to Low)') return b.price - a.price;
    if (sortOption === 'Category (A-Z)') return a.category.localeCompare(b.category);
    if (sortOption === 'Name (A-Z)') return a.name.localeCompare(b.name);
    if (sortOption === 'Type (Veg First)') return b.is_veg - a.is_veg;
    if (sortOption === 'Type (Non-Veg First)') return a.is_veg - b.is_veg;
    return 0;
  });

  const handleDragStartCat = (e, index) => {
    setDraggedCatIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCat = (e, index) => {
    e.preventDefault(); 
  };

  const handleDropCat = (e, targetIndex) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === targetIndex) return;
    const newCats = [...categories];
    const [removed] = newCats.splice(draggedCatIndex, 1);
    newCats.splice(targetIndex, 0, removed);
    setCategories(newCats);
    setDraggedCatIndex(null);
  };

  const saveCategoryOrder = async () => {
    try {
      await api.post('/menu/categories/order', { categories });
      setIsCategoryModalOpen(false);
      fetchMenu();
    } catch (err) {
      alert('Error saving category order');
    }
  };

  const downloadFormat = () => {
    const wsData = [
      ['Name', 'Description', 'Price', 'CostPrice', 'Category', 'IsVeg', 'Tags', 'Variants'],
      ['Margherita Pizza', 'Classic cheese pizza', 299, 100, 'Pizza', 1, 'Bestseller, Cheesy', 'Extra Cheese:50:20|Olives:30:10']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MenuFormat");
    XLSX.writeFile(wb, "Menu_Import_Format.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (data.length === 0) {
          return alert('File is empty');
        }

        const expectedKeys = ['Name', 'Description', 'Price', 'CostPrice', 'Category', 'IsVeg', 'Tags', 'Variants'];
        const actualKeys = Object.keys(data[0]);
        
        const hasAllKeys = expectedKeys.every(k => actualKeys.includes(k));
        if (!hasAllKeys) {
          return alert(`Invalid format! Please use the downloaded format.\nMissing columns: ${expectedKeys.filter(k => !actualKeys.includes(k)).join(', ')}`);
        }

        const itemsToImport = data.map(row => {
          let parsedVariants = [];
          if (row.Variants && typeof row.Variants === 'string') {
            parsedVariants = row.Variants.split('|').map(v => {
              const parts = v.split(':');
              const name = parts[0]?.trim();
              const price = parseFloat(parts[1]);
              const cost_price = parts[2] ? parseFloat(parts[2]) : 0;
              return { name, price, cost_price };
            }).filter(v => v.name && !isNaN(v.price));
          }

          return {
            name: row.Name,
            description: row.Description,
            price: row.Price,
            cost_price: row.CostPrice,
            category: row.Category,
            is_veg: row.IsVeg,
            tags: row.Tags ? JSON.stringify(row.Tags.toString().split(',').map(t => t.trim()).filter(Boolean)) : '[]',
            variants: parsedVariants
          };
        });

        const res = await api.post('/menu/bulk', { items: itemsToImport });
        const { imported, skipped, errors } = res.data.data;
        
        if (errors && errors.length > 0) {
          alert(`Import completed with errors.\nImported: ${imported}\nSkipped (Duplicates): ${skipped}\n\nErrors:\n${errors.join('\n')}`);
        } else {
          alert(`Successfully imported ${imported} items. Skipped ${skipped} duplicates.`);
        }
        
        fetchMenu();
      } catch (err) {
        console.error(err);
        alert('Failed to parse excel file');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-gray-600";
  const labelCls = "block text-xs text-gray-500 uppercase tracking-widest font-bold mb-2";
  const selectCls = "bg-[#0f0f0f] border border-white/10 text-gray-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all";

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Menu
          </h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">{menu.length} items</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={sortOption} onChange={e => setSortOption(e.target.value)} className={selectCls}>
            <option>Default</option>
            <option>Name (A-Z)</option>
            <option>Category (A-Z)</option>
            <option>Price (Low to High)</option>
            <option>Price (High to Low)</option>
            <option>Type (Veg First)</option>
            <option>Type (Non-Veg First)</option>
          </select>
          <button onClick={downloadFormat} className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 px-4 py-2.5 rounded-xl font-medium text-sm transition-all">
            <Download size={15} /> Format
          </button>
          <div>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={excelInputRef} onChange={handleFileUpload} />
            <button onClick={() => excelInputRef.current?.click()} className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 px-4 py-2.5 rounded-xl font-medium text-sm transition-all">
              <FileSpreadsheet size={15} /> Import
            </button>
          </div>
          <button onClick={() => setIsCategoryModalOpen(true)} className="bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 px-4 py-2.5 rounded-xl font-medium text-sm transition-all">
            Manage Categories
          </button>
          <button onClick={() => handleOpenModal(null, true)} className="bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 px-4 py-2.5 rounded-xl font-bold text-sm transition-all uppercase tracking-wider">
            + Combo Meal
          </button>
          <button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all text-sm uppercase tracking-wider">
            + Add Item
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 bg-[#0f0f0f] border border-white/5 p-4 rounded-2xl items-center">
        <input
          type="text"
          placeholder="Search by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-amber-500/50 placeholder:text-gray-600 transition-all"
        />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectCls}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectCls}>
          <option value="All">All Types</option>
          <option value="Veg">Veg Only</option>
          <option value="Non-Veg">Non-Veg Only</option>
        </select>
      </div>
      
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">Item Name</th>
              <th className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">Category</th>
              <th className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">Price</th>
              <th className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">Type</th>
              <th className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold">Available</th>
              <th className="px-5 py-4 text-xs text-gray-500 uppercase tracking-widest font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedMenu.map(item => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-4 font-bold text-gray-200">{item.name}</td>
                <td className="px-5 py-4 text-sm text-gray-500">{item.category}</td>
                <td className="px-5 py-4 font-black text-amber-500">₹{item.price}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    item.is_veg
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {item.is_veg ? 'Veg' : 'Non-Veg'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => toggleAvailability(item.id, item.is_available)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                      item.is_available ? 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'bg-white/10'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      item.is_available ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openVariantPanel(item)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all">Add-ons</button>
                    <button onClick={() => handleOpenModal(item)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Variant Management Panel */}
      {variantPanelItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] w-full max-w-md">
            <div className="flex justify-between items-start px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-serif font-black text-gray-100">Add-ons: {variantPanelItem.name}</h2>
                <p className="text-xs text-amber-500/60 mt-1 uppercase tracking-widest">Base price: ₹{variantPanelItem.price}</p>
              </div>
              <button onClick={() => setVariantPanelItem(null)} className="text-gray-600 hover:text-gray-300 bg-white/5 rounded-full p-1.5 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-2 mb-2">
              {variants.length === 0 && <p className="text-gray-600 text-sm italic">No add-ons yet.</p>}
              {variants.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <span className="font-medium text-sm text-gray-300">{v.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-amber-500 text-sm">{v.price > 0 ? `+₹${v.price}` : `-₹${Math.abs(v.price)}`}</span>
                    <button onClick={() => deleteVariant(v.id)} className="text-red-400/70 hover:text-red-400 text-xs font-bold transition-colors">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={addVariant} className="border-t border-white/10 p-4 flex gap-2">
              <input required type="text" placeholder="Add-on name" value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-amber-500/50 placeholder:text-gray-600" />
              <input required type="number" placeholder="Sell ₹" value={variantForm.price} onChange={e => setVariantForm({ ...variantForm, price: e.target.value })} className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-amber-500/50" />
              <input type="number" placeholder="Cost ₹" value={variantForm.cost_price} onChange={e => setVariantForm({ ...variantForm, cost_price: e.target.value })} className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-amber-500/50" />
              <button type="submit" className="bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black px-4 py-2 rounded-xl text-sm">Add</button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex justify-between items-center">
              <h2 className="text-xl font-serif font-black text-gray-100">{editingItem ? 'Edit Item' : showComboBuilder ? '+ Combo Meal' : '+ Add Item'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-300 bg-white/5 rounded-full p-1.5 transition-colors"><X size={15} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputCls} />
              </div>
              <div className="flex gap-4 bg-white/5 border border-white/10 p-3 rounded-xl">
                <span className="text-xs text-gray-500 uppercase tracking-wider mr-2 self-center">Type:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="is_veg" checked={formData.is_veg === 1} onChange={() => setFormData({...formData, is_veg: 1})} className="accent-amber-500" />
                  <span className="text-sm font-bold text-green-400">Veg</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="is_veg" checked={formData.is_veg === 0} onChange={() => setFormData({...formData, is_veg: 0})} className="accent-amber-500" />
                  <span className="text-sm font-bold text-red-400">Non-Veg</span>
                </label>
              </div>
              <div className={`grid ${showComboBuilder ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                <div><label className={labelCls}>Sell Price (₹)</label><input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Cost Price (₹)</label><input type="number" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className={inputCls} placeholder="Optional" readOnly={showComboBuilder} /></div>
                {!showComboBuilder && (
                  <div>
                    <label className={labelCls}>Category</label>
                    <input required list="categories" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputCls} placeholder="e.g. Starters" />
                    <datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputCls}></textarea>
              </div>
              {showComboBuilder && (() => {
                const availableItems = menu.filter(m => m.is_available && m.category !== 'Combo Meals' && m.is_veg === formData.is_veg);
                const selectedCount = Object.values(comboSelections).filter(s => s.selected).length;

                const updateSelections = (newSel) => {
                  setComboSelections(newSel);
                  const { description, cost_price } = buildComboState(newSel, menu);
                  setFormData(prev => ({ ...prev, description, cost_price }));
                };

                return (
                  <div className="border border-amber-500/20 rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-amber-500/10 px-4 py-3 flex items-center justify-between border-b border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-black text-sm uppercase tracking-widest">Combo Builder</span>
                        {selectedCount > 0 && (
                          <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">{selectedCount} item{selectedCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-600">Select items &amp; addons</span>
                    </div>

                    {/* Item list */}
                    <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                      {availableItems.map(mi => {
                        const sel = comboSelections[mi.id] || { selected: false, variantIds: new Set() };
                        const hasVariants = mi.variants?.length > 0;

                        const toggleItem = (checked) => {
                          const newSel = { ...comboSelections, [mi.id]: { selected: checked, variantIds: new Set() } };
                          if (!checked) delete newSel[mi.id];
                          updateSelections(newSel);
                        };

                        const toggleVariant = (variantId, checked) => {
                          const current = comboSelections[mi.id] || { selected: true, variantIds: new Set() };
                          const newVariantIds = new Set(current.variantIds);
                          if (checked) newVariantIds.add(variantId);
                          else newVariantIds.delete(variantId);
                          const newSel = { ...comboSelections, [mi.id]: { selected: true, variantIds: newVariantIds } };
                          updateSelections(newSel);
                        };

                        return (
                          <div key={mi.id} className={`transition-colors ${ sel.selected ? 'bg-amber-500/5' : 'hover:bg-white/[0.02]' }`}>
                            {/* Item row */}
                            <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                sel.selected ? 'bg-amber-500 border-amber-500' : 'border-white/20 hover:border-amber-500/50'
                              }`}>
                                {sel.selected && <span className="text-black text-xs font-black">✓</span>}
                              </div>
                              <input type="checkbox" checked={!!sel.selected} onChange={e => toggleItem(e.target.checked)} className="hidden" />
                              <div className="flex-1 min-w-0">
                                <span className={`font-bold text-sm ${ sel.selected ? 'text-gray-100' : 'text-gray-400' }`}>{mi.name}</span>
                                {sel.selected && sel.variantIds.size > 0 && (
                                  <span className="ml-2 text-amber-400/70 text-xs">
                                    + {[...sel.variantIds].map(vid => mi.variants?.find(v => v.id === vid)?.name).filter(Boolean).join(' & ')}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-600 shrink-0">₹{mi.cost_price || 0}</span>
                            </label>

                            {/* Variant pills — shown only when item is selected AND has variants */}
                            {sel.selected && hasVariants && (
                              <div className="px-4 pb-3 pt-0 flex flex-wrap gap-2 ml-8">
                                <span className="text-[10px] text-gray-600 uppercase tracking-wider self-center mr-1">Addon:</span>
                                {mi.variants.map(v => {
                                  const isVChecked = sel.variantIds.has(v.id);
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => toggleVariant(v.id, !isVChecked)}
                                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                        isVChecked
                                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                          : 'bg-white/5 border-white/10 text-gray-500 hover:border-amber-500/30 hover:text-gray-300'
                                      }`}
                                    >
                                      {v.name}
                                      {isVChecked && <span className="ml-1 text-amber-600">+₹{v.cost_price || 0}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Preview of description */}
                    {selectedCount > 0 && (
                      <div className="px-4 py-3 bg-black/40 border-t border-white/5">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Preview</p>
                        {formData.description.split('\n').filter(Boolean).map((line, i) => (
                          <p key={i} className="text-xs text-amber-400/80 font-mono">{line}</p>
                        ))}
                        <p className="text-[10px] text-gray-600 mt-1">Est. cost: ₹{formData.cost_price}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div>
                <label className={labelCls}>Image</label>
                <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 hover:border-white/20'
                  }`} onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-28 h-28 object-cover rounded-xl mx-auto mb-2" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute top-1 right-1/2 translate-x-14 bg-red-500 text-white rounded-full p-1">
                        <X size={12} />
                      </button>
                      <p className="text-xs text-gray-600">Click or drop to replace</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload size={22} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
                    </div>
                  )}
                </div>
                <input type="text" value={formData.image_url} onChange={e => { setFormData({...formData, image_url: e.target.value}); if (e.target.value) setImagePreview(e.target.value); }} placeholder="Or paste image URL" className={`${inputCls} mt-2`} />
              </div>
              <div className="pt-2 border-t border-white/10">
                <label className={labelCls}>Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full text-xs font-bold">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors"><X size={11} /></button>
                    </span>
                  ))}
                </div>
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="Type tag + Enter (e.g. Jain, Vegan)" className={inputCls} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 rounded-xl font-medium text-sm transition-all">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black rounded-xl text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-serif font-black text-gray-100">Reorder Categories</h2>
                <p className="text-xs text-gray-600 mt-0.5">Drag to reorder — this sets the customer menu order.</p>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-600 hover:text-gray-300 bg-white/5 rounded-full p-1.5 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {categories.map((cat, i) => (
                <div key={cat} draggable
                  onDragStart={(e) => handleDragStartCat(e, i)}
                  onDragOver={(e) => handleDragOverCat(e, i)}
                  onDrop={(e) => handleDropCat(e, i)}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-move transition-all select-none ${
                    draggedCatIndex === i
                      ? 'opacity-40 border-amber-500/40 bg-amber-500/5 scale-[0.98]'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <span className="text-gray-600 text-lg leading-none">⋮⋮</span>
                  <span className="font-medium text-gray-300 text-sm">{cat}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button onClick={() => setIsCategoryModalOpen(false)} className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 rounded-xl font-medium text-sm transition-all">Cancel</button>
              <button onClick={saveCategoryOrder} className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black rounded-xl text-sm uppercase tracking-wider transition-all">Save Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagementPage;
