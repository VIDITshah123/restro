import { useState, useEffect } from 'react';
import api from '../../api';

const TablesPage = () => {
  const [tables, setTables] = useState([]);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const createTable = async () => {
    const tableNumber = prompt('Enter Table Number (e.g. Table 11):');
    if (!tableNumber) return;
    
    try {
      await api.post('/tables', { table_number: tableNumber });
      fetchTables();
    } catch (err) {
      alert('Error creating table');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tables Management</h1>
        <button onClick={createTable} className="bg-black text-white px-4 py-2 rounded-lg font-medium">
          Add New Table
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => (
          <div key={table.id} className="bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-2">{table.table_number}</h3>
            
            <div className={`mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase
              ${table.is_occupied ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
            >
              {table.is_occupied ? 'Occupied' : 'Free'}
            </div>

            {table.qr_code_url && (
              <img src={table.qr_code_url} alt={`QR for ${table.table_number}`} className="w-32 h-32 mb-4 border p-1" />
            )}

            <button 
              onClick={async () => {
                if (confirm('Are you sure you want to delete this table?')) {
                  await api.delete(`/tables/${table.id}`);
                  fetchTables();
                }
              }}
              className="text-red-500 font-medium text-sm hover:underline"
            >
              Delete Table
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TablesPage;
