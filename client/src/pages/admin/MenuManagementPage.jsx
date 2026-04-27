import { useState, useEffect } from 'react';
import api from '../../api';

const MenuManagementPage = () => {
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [variantPanelItem, setVariantPanelItem] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantForm, setVariantForm] = useState({ name: '', price: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    is_veg: 1,
    is_available: 1
  });

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

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: item.category,
        image_url: item.image_url || '',
        is_veg: item.is_veg,
        is_available: item.is_available
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', description: '', price: '', category: '', image_url: '', is_veg: 1, is_available: 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, formData);
      } else {
        await api.post('/menu', formData);
      }
      setIsModalOpen(false);
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <button onClick={() => handleOpenModal()} className="bg-black text-white px-4 py-2 rounded-lg font-medium">
          + Add New Item
        </button>
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
            {menu.map(item => (
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
                  <button onClick={() => openVariantPanel(item)} className="text-purple-600 hover:text-purple-800 text-sm font-medium">Variants</button>
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
                <h2 className="text-xl font-bold">Variants: {variantPanelItem.name}</h2>
                <p className="text-sm text-gray-500">Base price: ₹{variantPanelItem.price}</p>
              </div>
              <button onClick={() => setVariantPanelItem(null)} className="text-gray-400 p-1">✕</button>
            </div>

            {/* Existing variants */}
            <div className="mb-4 space-y-2">
              {variants.length === 0 && <p className="text-gray-400 text-sm">No variants yet. Add one below.</p>}
              {variants.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-sm">{v.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">₹{v.price}</span>
                    <button onClick={() => deleteVariant(v.id)} className="text-red-500 text-xs font-medium">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add variant form */}
            <form onSubmit={addVariant} className="border-t pt-4 flex gap-2">
              <input
                required
                type="text"
                placeholder="Variant name (e.g. With Cheese Dip)"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border rounded-lg p-2" />
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
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input type="text" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full border rounded-lg p-2" />
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
              
              <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg font-medium">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagementPage;
