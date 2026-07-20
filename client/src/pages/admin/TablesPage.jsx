import { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, ShoppingBag, Plus, Grid3x3 } from 'lucide-react';
import AppDialog, { useDialog } from '../../components/AppDialog';

const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [tableInput, setTableInput] = useState('');
  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const createTable = async () => {
    const tableNumber = tableInput.trim() || window.prompt('Enter Table Number (e.g. Table 11):');
    if (!tableNumber) return;
    try {
      await api.post('/tables', { table_number: tableNumber });
      fetchTables();
    } catch (err) {
      await showAlert('Error creating table. Please try again.', { title: 'Error', danger: true });
    }
  };

  const handleDeleteTable = async (table) => {
    const confirmed = await showConfirm(`Delete ${table.table_number}? This cannot be undone.`, {
      title: 'Delete Table',
      danger: true,
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/tables/${table.id}`);
      fetchTables();
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Error deleting table.', { title: 'Error', danger: true });
    }
  };

  const downloadQR = async (table) => {
    try {
      if (!table.qr_code_url) throw new Error("No QR code URL");

      const img = new Image();
      img.crossOrigin = "Anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = table.qr_code_url;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 300; canvas.height = 400;

      // Background
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(table.table_number, canvas.width / 2, 40);

      // Draw QR image
      ctx.drawImage(img, 50, 60, 200, 200);

      // Subtext
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Scan QR to view menu', canvas.width / 2, 290);

      // URL text
      const menuUrl = `${window.location.origin}/menu/${table.id}`;
      ctx.font = '10px monospace';
      ctx.fillStyle = '#666666';
      ctx.fillText(menuUrl, canvas.width / 2, 320);

      // Branding
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#F59E0B';
      ctx.fillText('Yummy Bites', canvas.width / 2, 370);

      // Download
      const link = document.createElement('a');
      link.download = `${table.table_number.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      await showAlert('Failed to download QR code.', { title: 'Error', danger: true });
    }
  };

  const occupied = tables.filter(t => t.is_occupied).length;
  const free = tables.length - occupied;

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Tables
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            <span className="text-green-400 font-bold">{free} free</span>
            <span className="text-gray-600 mx-2">·</span>
            <span className="text-red-400 font-bold">{occupied} occupied</span>
            <span className="text-gray-600 mx-2">·</span>
            <span className="text-gray-500">{tables.length} total</span>
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={createTable}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all text-sm uppercase tracking-wider"
        >
          <Plus size={16} strokeWidth={2.5} /> Add Table
        </motion.button>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((table, idx) => (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
            className={`bg-[#0f0f0f] rounded-2xl border p-5 flex flex-col items-center transition-all ${table.is_occupied ? 'border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'border-white/5'
              }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${table.is_occupied ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'
              }`}>
              <Grid3x3 size={22} className={table.is_occupied ? 'text-red-400' : 'text-green-400'} strokeWidth={1.5} />
            </div>

            <h3 className="text-base font-bold text-gray-100 mb-2 text-center">{table.table_number}</h3>

            <span className={`mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${table.is_occupied ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
              }`}>
              {table.is_occupied ? 'Occupied' : 'Free'}
            </span>

            {table.qr_code_url && (
              <div className="bg-white rounded-xl p-1.5 mb-4">
                <img src={table.qr_code_url} alt={`QR for ${table.table_number}`} className="w-24 h-24" />
              </div>
            )}

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => window.open(`/menu/${table.id}`, '_blank')}
                className="w-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-xs py-2.5 rounded-xl hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <ShoppingBag size={13} /> Place Order
              </button>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => downloadQR(table)}
                  className="flex-1 bg-white/5 text-gray-400 border border-white/10 font-medium text-xs py-2.5 rounded-xl hover:bg-white/10 hover:text-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Download size={12} /> QR
                </button>
                <button
                  onClick={() => handleDeleteTable(table)}
                  className="px-3 py-2.5 bg-red-500/5 border border-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <AppDialog dialogState={dialogState} closeDialog={closeDialog} />
    </div>
  );
};

export default TablesPage;
