import { useState, useEffect } from 'react';
import api from '../../api';
import { Download, Trash2 } from 'lucide-react';

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

  const downloadQR = async (table) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 300;
      canvas.height = 350;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(table.table_number, canvas.width / 2, 40);
      
      const menuUrl = `${window.location.origin}/menu/${table.id}`;
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('Scan QR to view menu', canvas.width / 2, 70);
      
      const qrPlaceholder = `QR Code for:\n${menuUrl}`;
      ctx.font = '12px monospace';
      ctx.fillStyle = '#333333';
      const lines = qrPlaceholder.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, 120 + i * 20);
      });
      
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillStyle = '#F97316';
      ctx.fillText('Restaurant Management System', canvas.width / 2, 320);
      
      const link = document.createElement('a');
      link.download = `${table.table_number.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error downloading QR:', err);
      alert('Failed to download QR code');
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

            <div className="flex gap-2 w-full">
              <button 
                onClick={() => downloadQR(table)}
                className="flex-1 bg-blue-50 text-blue-600 font-medium text-sm py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
              >
                <Download size={14} />
                Download QR
              </button>
              <button 
                onClick={async () => {
                  if (!confirm(`Delete ${table.table_number}? This cannot be undone.`)) return;
                  try {
                    await api.delete(`/tables/${table.id}`);
                    fetchTables();
                  } catch (err) {
                    const msg = err.response?.data?.message || 'Error deleting table';
                    alert(msg);
                  }
                }}
                className="text-red-500 font-medium text-sm hover:underline px-2 flex items-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TablesPage;
