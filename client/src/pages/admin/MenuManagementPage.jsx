import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const MenuManagementPage = () => {
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [variantPanelItem, setVariantPanelItem] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantForm, setVariantForm] = useState({ name: '', price: '' });
  const [sortOption, setSortOption] = useState('Default');
  
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

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price,
        cost_price: item.cost_price || '',
        category: item.category,
        image_url: item.image_url || '',
        is_veg: item.is_veg,
        is_available: item.is_available,
        tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : []
      });
      setImagePreview(item.image_url || null);
    } else {
      setEditingItem(null);
      setFormData({
        name: '', description: '', price: '', cost_price: '', category: '', image_url: '', is_veg: 1, is_available: 1, tags: []
      });
      setImagePreview(null);
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
    setVariantForm({ name: '', price: '' });
    const res = await api.get(`/menu/${item.id}/variants`);
    setVariants(res.data.data);
  };

  const addVariant = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/menu/${variantPanelItem.id}/variants`, variantForm);
      const res = await api.get(`/menu/${variantPanelItem.id}/variants`);
      setVariants(res.data.data);
      setVariantForm({ name: '', price: '' });
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

  const sortedMenu = [...menu].sort((a, b) => {
    if (sortOption === 'Price (Low to High)') return a.price - b.price;
    if (sortOption === 'Price (High to Low)') return b.price - a.price;
    if (sortOption === 'Category (A-Z)') return a.category.localeCompare(b.category);
    if (sortOption === 'Name (A-Z)') return a.name.localeCompare(b.name);
    if (sortOption === 'Type (Veg First)') return b.is_veg - a.is_veg;
    if (sortOption === 'Type (Non-Veg First)') return a.is_veg - b.is_veg;
    return 0;
  });

  const moveCategory = (index, direction) => {
    const newCats = [...categories];
    if (direction === 'up' && index > 0) {
      [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
      setCategories(newCats);
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
      setCategories(newCats);
    }
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <div className="flex items-center gap-4">
          <select 
            value={sortOption} 
            onChange={e => setSortOption(e.target.value)}
            className="border p-2 rounded-lg text-sm bg-white outline-none"
          >
            <option>Default</option>
            <option>Name (A-Z)</option>
            <option>Category (A-Z)</option>
            <option>Price (Low to High)</option>
            <option>Price (High to Low)</option>
            <option>Type (Veg First)</option>
            <option>Type (Non-Veg First)</option>
          </select>
          <button onClick={() => setIsCategoryModalOpen(true)} className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium">
            Manage Categories
          </button>
          <button onClick={() => handleOpenModal()} className="bg-black text-white px-4 py-2 rounded-lg font-medium">
            + Add New Item
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Item Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Type</th>
              <th className="p-4">Available</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedMenu.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">{item.name}</td>
                <td className="p-4">{item.category}</td>
                <td className="p-4">₹{item.price}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${item.is_veg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.is_veg ? 'Veg' : 'Non-Veg'}
                  </span>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => toggleAvailability(item.id, item.is_available)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      item.is_available ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      item.is_available ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => openVariantPanel(item)} className="text-purple-600 hover:text-purple-800 text-sm font-medium">Add-ons</button>
                  <button onClick={() => handleOpenModal(item)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Variant Management Panel */}
      {variantPanelItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Add-ons: {variantPanelItem.name}</h2>
                <p className="text-sm text-gray-500">Base price: ₹{variantPanelItem.price}</p>
              </div>
              <button onClick={() => setVariantPanelItem(null)} className="text-gray-400 p-1">✕</button>
            </div>

            {/* Existing add-ons */}
            <div className="mb-4 space-y-2">
              {variants.length === 0 && <p className="text-gray-400 text-sm">No add-ons yet. Add one below.</p>}
              {variants.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-sm">{v.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">
                      {v.price > 0 ? `+₹${v.price}` : `-₹${Math.abs(v.price)}`}
                    </span>
                    <button onClick={() => deleteVariant(v.id)} className="text-red-500 text-xs font-medium">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add addon form */}
            <form onSubmit={addVariant} className="border-t pt-4 flex gap-2">
              <input
                required
                type="text"
                placeholder="Add-on name (e.g. Extra Cheese)"
                value={variantForm.name}
                onChange={e => setVariantForm({ ...variantForm, name: e.target.value })}
                className="flex-1 border rounded-lg p-2 text-sm"
              />
              <input
                required
                type="number"
                placeholder="₹"
                value={variantForm.price}
                onChange={e => setVariantForm({ ...variantForm, price: e.target.value })}
                className="w-20 border rounded-lg p-2 text-sm"
              />
              <button type="submit" className="bg-black text-white px-3 py-2 rounded-lg text-sm font-bold">Add</button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price (₹)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Price (₹)</label>
                  <input type="number" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className="w-full border rounded-lg p-2" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input required list="categories" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border rounded-lg p-2" placeholder="e.g. Starters" />
                  <datalist id="categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-lg p-2"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto mb-2" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(); }}
                        className="absolute top-1 right-1/2 translate-x-16 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                      <p className="text-sm text-gray-500">Click or drop to replace</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-600">Drag & drop an image here</p>
                      <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={e => {
                    setFormData({...formData, image_url: e.target.value});
                    if (e.target.value) setImagePreview(e.target.value);
                  }}
                  placeholder="Or paste image URL here"
                  className="w-full border rounded-lg p-2 mt-2 text-sm"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="is_veg" checked={formData.is_veg === 1} onChange={() => setFormData({...formData, is_veg: 1})} className="accent-black" />
                  <span className="text-sm font-medium text-green-700">Veg</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="is_veg" checked={formData.is_veg === 0} onChange={() => setFormData({...formData, is_veg: 0})} className="accent-black" />
                  <span className="text-sm font-medium text-red-700">Non-Veg</span>
                </label>
              </div>

              {/* Customizable Tag Options */}
              <div className="pt-2 border-t mt-4">
                <label className="block text-sm font-medium mb-1">Available Food Types / Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm font-medium">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-200 p-0.5">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter (e.g. Jain, Vegan)"
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg font-medium">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold mb-4">Reorder Categories</h2>
            <p className="text-sm text-gray-500 mb-4">Categories appear on the customer app in this order.</p>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {categories.map((cat, i) => (
                <div key={cat} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                  <span className="font-medium">{cat}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => moveCategory(i, 'up')} 
                      disabled={i === 0}
                      className="p-1 border rounded bg-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button 
                      onClick={() => moveCategory(i, 'down')} 
                      disabled={i === categories.length - 1}
                      className="p-1 border rounded bg-white disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 border rounded-lg font-medium">Cancel</button>
              <button onClick={saveCategoryOrder} className="px-4 py-2 bg-black text-white rounded-lg font-medium">Save Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagementPage;
