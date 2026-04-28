const db = require('../db');

const getKot = (req, res) => {
  const kots = db.prepare(`
    SELECT k.*, t.table_number
    FROM kot k
    JOIN tables t ON k.table_id = t.id
    WHERE k.status != 'served'
    ORDER BY k.generated_at ASC
  `).all();
  
  for (const kot of kots) {
    kot.items = db.prepare(`
      SELECT oi.*, m.name, m.is_veg 
      FROM order_items oi 
      JOIN menu_items m ON oi.menu_item_id = m.id 
      WHERE oi.order_id = ?
    `).all(kot.order_id);
  }
  
  res.json({ success: true, data: kots });
};

const getKotHistory = (req, res) => {
  const kots = db.prepare(`
    SELECT k.*, t.table_number
    FROM kot k
    JOIN tables t ON k.table_id = t.id
    WHERE k.status = 'served'
    ORDER BY k.generated_at DESC
    LIMIT 50
  `).all();
  
  for (const kot of kots) {
    kot.items = db.prepare(`
      SELECT oi.*, m.name, m.is_veg 
      FROM order_items oi 
      JOIN menu_items m ON oi.menu_item_id = m.id 
      WHERE oi.order_id = ?
    `).all(kot.order_id);
  }

  res.json({ success: true, data: kots });
};

const updateKotStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.prepare("UPDATE kot SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  
  const kot = db.prepare('SELECT order_id, table_id FROM kot WHERE id = ?').get(id);
  
  // KOT only tracks kitchen status — it never touches orders or tables.
  // Billing is completely independent and handles table/order state.

  if (req.io) {
    const payload = { kotId: parseInt(id), newStatus: status, orderId: kot.order_id, tableId: kot.table_id };
    req.io.of('/customer').to(`order:${kot.order_id}`).emit('kot:statusUpdate', payload);
    req.io.of('/admin').to('admin:global').emit('kot:statusUpdate', payload);
    req.io.of('/waiter').to('waiter:global').emit('kot:statusUpdate', payload);
    
    if (status === 'ready') {
      // Notify waiters that an order is ready to be served
      const tableInfo = db.prepare('SELECT table_number FROM tables WHERE id = ?').get(kot.table_id);
      req.io.of('/waiter').to('waiter:global').emit('order:ready', { 
        kotId: parseInt(id), 
        orderId: kot.order_id, 
        tableId: kot.table_id,
        tableNumber: tableInfo ? tableInfo.table_number : `Table ${kot.table_id}`
      });
    }
    // Table freed only via Billing page (generateTableBill)
  }

  res.json({ success: true });
};

module.exports = {
  getKot,
  getKotHistory,
  updateKotStatus
};
