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
    const menuUrl = `http://localhost:5173/menu/${tableId}`;
    const qr_code_url = await qrcode.toDataURL(menuUrl);
    
    db.prepare('UPDATE tables SET qr_code_url = ? WHERE id = ?').run(qr_code_url, tableId);
    
    res.json({ success: true, data: { id: tableId, qr_code_url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTable = (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM tables WHERE id = ?').run(id);
  res.json({ success: true });
};

module.exports = {
  getTables,
  getTableById,
  createTable,
  deleteTable
};
