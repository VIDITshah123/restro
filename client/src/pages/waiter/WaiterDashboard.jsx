import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const WaiterDashboard = () => {
  const [tables, setTables] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await api.get('/tables');
        setTables(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTables();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-2">Waiter Dashboard</h1>
      <p className="text-gray-600 mb-8">Select a table to place an order</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tables.map(table => (
          <button
            key={table.id}
            onClick={() => navigate(`/menu/${table.id}`)}
            className={`p-6 rounded-2xl border-2 text-center transition-all ${
              table.is_occupied 
                ? 'bg-orange-50 border-orange-200 text-orange-700' 
                : 'bg-white border-gray-200 hover:border-black'
            }`}
          >
            <h2 className="text-2xl font-black mb-1">{table.table_number}</h2>
            <span className="text-sm font-bold uppercase tracking-wider">
              {table.is_occupied ? 'Occupied' : 'Free'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WaiterDashboard;
