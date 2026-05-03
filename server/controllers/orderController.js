const db = require('../db');
const kotService = require('../services/kotService');

const createOrder = (req, res) => {
  const { tableId, items, notes, customerName } = req.body;
  // items: [{ menuItemId, quantity, specialNotes, price }]

  try {
    const insertOrder = db.prepare('INSERT INTO orders (table_id, total_amount, customer_name) VALUES (?, ?, ?)');
    const insertOrderItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, special_notes) VALUES (?, ?, ?, ?)');
    
    const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let orderId;
    db.transaction(() => {
      const orderInfo = insertOrder.run(tableId, total_amount, customerName || 'Guest');
      orderId = orderInfo.lastInsertRowid;
      
      for (const item of items) {
        insertOrderItem.run(orderId, item.menuItemId, item.quantity, item.specialNotes || '');
      }

      // Generate KOT
      const kotNumber = kotService.generateKotNumber();
      db.prepare('INSERT INTO kot (kot_number, order_id, table_id, status) VALUES (?, ?, ?, ?)').run(kotNumber, orderId, tableId, 'received');
      
      // Update table occupancy
      db.prepare('UPDATE tables SET is_occupied = 1 WHERE id = ?').run(tableId);
    })();

    // Fetch the complete KOT to emit
    const kot = db.prepare('SELECT * FROM kot WHERE order_id = ?').get(orderId);
    kot.items = db.prepare(`
      SELECT oi.id, oi.quantity, oi.special_notes, oi.menu_item_id, m.name, m.is_veg 
      FROM order_items oi 
      JOIN menu_items m ON oi.menu_item_id = m.id 
      WHERE oi.order_id = ?
    `).all(orderId);
    
    const table = db.prepare('SELECT table_number FROM tables WHERE id = ?').get(tableId);
    kot.table_number = table.table_number;
    kot.tableNumber = table.table_number;

    if (req.io) {
      req.io.of('/kitchen').to('kitchen:global').emit('kot:new', kot);
      req.io.of('/admin').to('admin:global').emit('kot:new', kot);
      req.io.of('/admin').emit('table:statusChanged', { tableId, isOccupied: 1 });
    }

    res.json({ success: true, data: { orderId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrders = (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, t.table_number, k.kot_number, k.status as kot_status
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    LEFT JOIN kot k ON o.id = k.order_id
    ORDER BY o.placed_at DESC
  `).all();
  res.json({ success: true, data: orders });
};

const getOrderById = (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  
  order.items = db.prepare(`
    SELECT oi.*, m.name, m.price, m.is_veg 
    FROM order_items oi 
    JOIN menu_items m ON oi.menu_item_id = m.id 
    WHERE oi.order_id = ?
  `).all(id);
  
  const kot = db.prepare('SELECT status FROM kot WHERE order_id = ?').get(id);
  if (kot) {
    order.kot_status = kot.status;
  }

  res.json({ success: true, data: order });
};

const updateOrderStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  res.json({ success: true });
};

const generateBill = (req, res) => {
  const { id } = req.params;
  
  try {
    const order = db.prepare('SELECT table_id FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    db.transaction(() => {
      db.prepare("UPDATE orders SET status = 'billed', updated_at = datetime('now') WHERE id = ?").run(id);
      db.prepare('UPDATE tables SET is_occupied = 0 WHERE id = ?').run(order.table_id);
    })();
    
    if (req.io) {
      req.io.of('/admin').emit('table:statusChanged', { tableId: order.table_id, isOccupied: 0 });
    }
    
    res.json({ success: true, message: 'Bill generated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const requestBill = (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT o.table_id, t.table_number FROM orders o JOIN tables t ON o.table_id = t.id WHERE o.id = ?').get(id);
  if (!order) return res.status(404).json({ success: false });
  
  if (req.io) {
    req.io.of('/admin').emit('notification:bill_request', { tableNumber: order.table_number, tableId: order.table_id, orderId: id });
  }
  res.json({ success: true });
};

const requestBillByTable = (req, res) => {
  const { tableId } = req.params;
  const table = db.prepare('SELECT table_number FROM tables WHERE id = ?').get(tableId);
  if (!table) return res.status(404).json({ success: false });
  
  if (req.io) {
    req.io.of('/admin').emit('notification:bill_request', { tableNumber: table.table_number, tableId: parseInt(tableId) });
  }
  res.json({ success: true });
};

// ── Billing: Get all un-billed orders for a table ─────────────────────────────
// Returns all orders placed since the table last became occupied (status != 'billed')
const getBillingForTable = (req, res) => {
  const { tableId } = req.params;

  // Find the time of the last billing event for this table
  const lastBill = db.prepare(`
    SELECT MAX(updated_at) as last_billed
    FROM orders
    WHERE table_id = ? AND status = 'billed'
  `).get(tableId);

  let orders;
  if (lastBill && lastBill.last_billed) {
    orders = db.prepare(`
      SELECT o.*, t.table_number
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.table_id = ? AND o.status != 'billed' AND o.placed_at > ?
      ORDER BY o.placed_at ASC
    `).all(tableId, lastBill.last_billed);
  } else {
    orders = db.prepare(`
      SELECT o.*, t.table_number
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.table_id = ? AND o.status != 'billed'
      ORDER BY o.placed_at ASC
    `).all(tableId);
  }

  // Attach items to each order
  for (const order of orders) {
    order.items = db.prepare(`
      SELECT oi.*, m.name, m.price, m.is_veg 
      FROM order_items oi 
      JOIN menu_items m ON oi.menu_item_id = m.id 
      WHERE oi.order_id = ?
    `).all(order.id);
  }

  const grandTotal = orders.reduce((sum, o) => sum + o.total_amount, 0);
  res.json({ success: true, data: { orders, grandTotal } });
};

// ── Billing: Bill the entire table (all current orders) ───────────────────────
const generateTableBill = (req, res) => {
  const { tableId } = req.params;
  const { payment_method } = req.body;

  try {
    db.transaction(() => {
      db.prepare("UPDATE orders SET status = 'billed', updated_at = datetime('now'), payment_method = ? WHERE table_id = ? AND status != 'billed'").run(payment_method || 'Cash', tableId);
      db.prepare('UPDATE tables SET is_occupied = 0 WHERE id = ?').run(tableId);
    })();

    if (req.io) {
      req.io.of('/admin').emit('table:statusChanged', { tableId: parseInt(tableId), isOccupied: 0 });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearOrderHistory = (req, res) => {
  try {
    db.prepare("DELETE FROM kot WHERE order_id IN (SELECT id FROM orders WHERE status = 'billed')").run();
    db.prepare("DELETE FROM orders WHERE status = 'billed'").run();
    res.json({ success: true, message: 'Order history cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearKotHistory = (req, res) => {
  try {
    db.prepare("DELETE FROM kot WHERE status = 'served'").run();
    res.json({ success: true, message: 'KOT history cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  generateBill,
  requestBill,
  requestBillByTable,
  getBillingForTable,
  generateTableBill,
  clearOrderHistory,
  clearKotHistory,
};

