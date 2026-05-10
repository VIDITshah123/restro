const db = require('../db');
const qrcode = require('qrcode');

const getTables = (req, res) => {
  const tables = db.prepare('SELECT * FROM tables').all();
  res.json({ success: true, data: tables });
};

const getTableById = (req, res) => {
  const { tableId } = req.params;
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId);
  if (!table) {
    return res.status(404).json({ success: false, message: 'Table not found' });
  }
  res.json({ success: true, data: table });
};

const createTable = async (req, res) => {
  const { table_number } = req.body;
  try {
    const insert = db.prepare('INSERT INTO tables (table_number) VALUES (?)');
    const info = insert.run(table_number);
    const tableId = info.lastInsertRowid;

    // Generate QR code
    const host = req.get('host') || 'localhost:5173';
    const protocol = req.protocol || 'http';
    const menuUrl = `${protocol}://${host}/menu/${tableId}`;
    const qr_code_url = await qrcode.toDataURL(menuUrl);
    
    db.prepare('UPDATE tables SET qr_code_url = ? WHERE id = ?').run(qr_code_url, tableId);
    
    res.json({ success: true, data: { id: tableId, qr_code_url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTable = (req, res) => {
  const { id } = req.params;

  try {
    // Check if table is occupied
    const table = db.prepare('SELECT is_occupied FROM tables WHERE id = ?').get(id);
    if (table && table.is_occupied === 1) {
      return res.status(409).json({ success: false, message: 'Cannot delete an occupied table.' });
    }

    // Check if any active (un-hidden) orders reference this table
    const activeOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE table_id = ? AND is_hidden = 0').get(id);
    if (activeOrders.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete table. Please clear its orders from the Billing/Order History first.'
      });
    }

    // Safe to delete. We must cascade delete the hidden orders and KOTs to respect SQLite foreign keys.
    db.transaction(() => {
      db.prepare('DELETE FROM kot WHERE table_id = ?').run(id);
      db.prepare('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = ?)').run(id);
      db.prepare('DELETE FROM orders WHERE table_id = ?').run(id);
      db.prepare('DELETE FROM tables WHERE id = ?').run(id);
    })();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  getTables,
  getTableById,
  createTable,
  deleteTable
};
