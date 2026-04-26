import { useState, useEffect } from 'react';
import api from '../../api';

const MenuManagementPage = () => {
  const [menu, setMenu] = useState([]);

  const fetchMenu = async () => {
    try {
      const res = await api.get('/menu');
      setMenu(res.data.data);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Menu Management</h1>
      
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Item Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Type</th>
              <th className="p-4">Available</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MenuManagementPage;
