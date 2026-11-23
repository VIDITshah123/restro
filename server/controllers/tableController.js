const db = require('../db');
const qrcode = require('qrcode');

// ── Table Groups ──────────────────────────────────────────────────────────────

const getTableGroups = (req, res) => {
  const groups = db.prepare('SELECT * FROM table_groups ORDER BY sort_order ASC, name ASC').all();
  res.json({ success: true, data: groups });
};

const createTableGroup = (req, res) => {
  const { name, sort_order = 0 } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Group name is required.' });
  }
  try {
    const info = db.prepare('INSERT INTO table_groups (name, sort_order) VALUES (?, ?)').run(name.trim(), sort_order);
    const group = db.prepare('SELECT * FROM table_groups WHERE id = ?').get(info.lastInsertRowid);
    res.json({ success: true, data: group });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: `Group "${name}" already exists.` });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTableGroup = (req, res) => {
  const { id } = req.params;
  try {
    const inUse = db.prepare('SELECT COUNT(*) as count FROM tables WHERE group_id = ?').get(id);
    if (inUse.count > 0) {
      return res.status(409).json({ success: false, message: 'Cannot delete group: tables are assigned to it. Remove tables from this group first.' });
    }
    db.prepare('DELETE FROM table_groups WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Tables CRUD ───────────────────────────────────────────────────────────────

const getTables = (req, res) => {
  const includeSystem = req.query.includeSystem === 'true';
  const query = includeSystem
    ? `SELECT t.*, tg.name as group_name FROM tables t LEFT JOIN table_groups tg ON t.group_id = tg.id ORDER BY t.id ASC`
    : `SELECT t.*, tg.name as group_name FROM tables t LEFT JOIN table_groups tg ON t.group_id = tg.id WHERE t.id NOT IN (9991, 9992) AND t.table_number NOT IN ('Takeaway', 'Free Home Delivery') ORDER BY t.id ASC`;
  const tables = db.prepare(query).all();
  res.json({ success: true, data: tables });
};

const getTableById = (req, res) => {
  const { tableId } = req.params;
  const table = db.prepare(
    `SELECT t.*, tg.name as group_name FROM tables t LEFT JOIN table_groups tg ON t.group_id = tg.id WHERE t.id = ?`
  ).get(tableId);
  if (!table) {
    return res.status(404).json({ success: false, message: 'Table not found' });
  }
  res.json({ success: true, data: table });
};

const createTable = async (req, res) => {
  const { table_number, capacity = 4, group_id = null } = req.body;
  if (!table_number || !table_number.trim()) {
    return res.status(400).json({ success: false, message: 'Table number is required.' });
  }
  try {
    const insert = db.prepare(
      'INSERT INTO tables (table_number, capacity, group_id) VALUES (?, ?, ?)'
    );
    const info = insert.run(table_number.trim(), capacity, group_id || null);
    const tableId = info.lastInsertRowid;

    // Generate QR code
    const host = req.get('host') || 'localhost:5173';
    const protocol = req.protocol || 'http';
    const menuUrl = `${protocol}://${host}/menu/${tableId}`;
    const qr_code_url = await qrcode.toDataURL(menuUrl);

    db.prepare('UPDATE tables SET qr_code_url = ? WHERE id = ?').run(qr_code_url, tableId);

    const table = db.prepare(
      `SELECT t.*, tg.name as group_name FROM tables t LEFT JOIN table_groups tg ON t.group_id = tg.id WHERE t.id = ?`
    ).get(tableId);

    res.json({ success: true, data: table });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: `Table "${table_number}" already exists.` });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTable = (req, res) => {
  const { id } = req.params;
  try {
    const parsedId = parseInt(id);
    if (parsedId === 9991 || parsedId === 9992) {
      return res.status(400).json({ success: false, message: 'Cannot delete system order channels (Takeaway / Delivery).' });
    }

    const table = db.prepare('SELECT status, is_occupied FROM tables WHERE id = ?').get(parsedId);
    if (table && (table.status === 'occupied' || table.status === 'hold' || table.is_occupied === 1)) {
      return res.status(409).json({ success: false, message: 'Cannot delete an occupied or active table.' });
    }

    const activeOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE table_id = ? AND is_hidden = 0').get(parsedId);
    if (activeOrders.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete table. Please clear its orders from the Billing/Order History first.'
      });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM kot WHERE table_id = ?').run(parsedId);
      db.prepare('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = ?)').run(parsedId);
      db.prepare('DELETE FROM orders WHERE table_id = ?').run(parsedId);
      db.prepare('DELETE FROM tables WHERE id = ?').run(parsedId);
    })();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Table Status ──────────────────────────────────────────────────────────────

const updateTableStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const parsedId = parseInt(id);

  const validStatuses = ['free', 'occupied'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Can only set 'free' or 'occupied' manually. 'hold' is set automatically when an order is placed.`
    });
  }

  try {
    const table = db.prepare('SELECT id, status FROM tables WHERE id = ?').get(parsedId);
    if (!table) return res.status(404).json({ success: false, message: 'Table not found.' });
    if (table.status === 'hold') {
      return res.status(409).json({ success: false, message: 'Table has an active order. Bill the table first before changing status.' });
    }

    const isOccupied = status !== 'free' ? 1 : 0;
    db.prepare("UPDATE tables SET status = ?, is_occupied = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, isOccupied, parsedId);

    if (req.io) {
      req.io.of('/admin').emit('table:statusChanged', { tableId: parsedId, status });
      req.io.of('/waiter').emit('table:statusChanged', { tableId: parsedId, status });
    }

    res.json({ success: true, data: { tableId: parsedId, status } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Table Merging ─────────────────────────────────────────────────────────────

const mergeTables = (req, res) => {
  const { tableId1, tableId2 } = req.body;
  if (!tableId1 || !tableId2) {
    return res.status(400).json({ success: false, message: 'Both tableId1 and tableId2 are required.' });
  }
  if (parseInt(tableId1) === parseInt(tableId2)) {
    return res.status(400).json({ success: false, message: 'Cannot merge a table with itself.' });
  }
  try {
    const t1 = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId1);
    const t2 = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId2);
    if (!t1 || !t2) return res.status(404).json({ success: false, message: 'One or both tables not found.' });
    if (t1.status === 'hold' || t2.status === 'hold') {
      return res.status(409).json({ success: false, message: 'Cannot merge tables with active orders. Please bill all orders first.' });
    }
    if (t1.merged_with_id || t2.merged_with_id) {
      return res.status(409).json({ success: false, message: 'One or both tables are already merged. Unmerge first.' });
    }

    db.prepare('UPDATE tables SET merged_with_id = ? WHERE id = ?').run(tableId1, tableId2);

    if (req.io) {
      req.io.of('/admin').emit('table:merged', { tableId1: parseInt(tableId1), tableId2: parseInt(tableId2) });
    }

    res.json({ success: true, data: { mergedIntoTableId: parseInt(tableId1), mergedTableId: parseInt(tableId2) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const unmergeTables = (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('UPDATE tables SET merged_with_id = NULL WHERE id = ? OR merged_with_id = ?').run(id, id);
    if (req.io) {
      req.io.of('/admin').emit('table:unmerged', { tableId: parseInt(id) });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTables,
  getTableById,
  createTable,
  deleteTable,
  updateTableStatus,
  mergeTables,
  unmergeTables,
  getTableGroups,
  createTableGroup,
  deleteTableGroup
};
