const db = require('../db');

const getKot = (req, res) => {
  const kots = db.prepare(`
    SELECT k.*,
      CASE
        WHEN k.order_type = 'takeaway' OR o.order_type = 'takeaway' THEN 'Takeaway'
        WHEN k.order_type = 'delivery' OR o.order_type = 'delivery' THEN 'Free Home Delivery'
        ELSE COALESCE(t.table_number, 'Table ' || k.table_id)
      END as table_number,
      COALESCE(k.order_type, o.order_type, 'dine_in') as order_type,
      COALESCE(o.is_online, 0) as is_online,
      COALESCE(k.online_platform, o.online_platform, '') as online_platform,
      o.customer_name,
      o.customer_phone,
      o.customer_address
    FROM kot k
    LEFT JOIN orders o ON k.order_id = o.id
    LEFT JOIN tables t ON k.table_id = t.id
    WHERE k.status != 'served'
    ORDER BY k.generated_at ASC
  `).all();

  for (const kot of kots) {
    kot.items = db.prepare(`
      SELECT oi.*, m.name, m.is_veg, m.description, m.category
      FROM order_items oi 
      JOIN menu_items m ON oi.menu_item_id = m.id 
      WHERE oi.order_id = ?
    `).all(kot.order_id);
  }

  res.json({ success: true, data: kots });
};

const getKotHistory = (req, res) => {
  const { start, end } = req.query;

  let query = `
    SELECT k.*,
      CASE
        WHEN k.order_type = 'takeaway' OR o.order_type = 'takeaway' THEN 'Takeaway'
        WHEN k.order_type = 'delivery' OR o.order_type = 'delivery' THEN 'Free Home Delivery'
        ELSE COALESCE(t.table_number, 'Table ' || k.table_id)
      END as table_number,
      COALESCE(k.order_type, o.order_type, 'dine_in') as order_type,
      COALESCE(o.is_online, 0) as is_online,
      COALESCE(k.online_platform, o.online_platform, '') as online_platform,
      o.customer_name,
      o.customer_phone,
      o.customer_address
    FROM kot k
    LEFT JOIN orders o ON k.order_id = o.id
    LEFT JOIN tables t ON k.table_id = t.id
    WHERE k.status = 'served'
  `;
  const params = [];

  if (start) {
    query += ` AND k.generated_at >= ?`;
    params.push(start);
  }
  if (end) {
    query += ` AND k.generated_at < datetime(?, '+1 day')`;
    params.push(end);
  }

  query += ` ORDER BY k.generated_at DESC LIMIT 500`;
  const kots = db.prepare(query).all(...params);

  for (const kot of kots) {
    kot.items = db.prepare(`
      SELECT oi.*, m.name, m.is_veg, m.description, m.category
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

  const kot = db.prepare(`
    SELECT k.*, o.order_type, o.online_platform, o.is_online
    FROM kot k 
    LEFT JOIN orders o ON k.order_id = o.id 
    WHERE k.id = ?
  `).get(id);

  if (req.io && kot) {
    const tableInfo = db.prepare('SELECT table_number FROM tables WHERE id = ?').get(kot.table_id);
    let resolvedTableNumber = tableInfo ? tableInfo.table_number : `Table ${kot.table_id}`;
    if (kot.order_type === 'takeaway') resolvedTableNumber = 'Takeaway';
    if (kot.order_type === 'delivery') resolvedTableNumber = 'Free Home Delivery';

      const payload = {
        kotId: parseInt(id),
        newStatus: status,
        orderId: kot.order_id,
        tableId: kot.table_id,
        tableNumber: resolvedTableNumber,
        orderType: kot.order_type,
        onlinePlatform: kot.online_platform
      };

      req.io.of('/customer').to(`order:${kot.order_id}`).emit('kot:statusUpdate', payload);
      req.io.of('/customer').to(`table:${kot.table_id}`).emit('kot:statusUpdate', payload);
      req.io.of('/admin').to('admin:global').emit('kot:statusUpdate', payload);
      req.io.of('/kitchen').to('kitchen:global').emit('kot:statusUpdate', payload);
      req.io.of('/waiter').to('waiter:global').emit('kot:statusUpdate', payload);

      if (status === 'ready') {
        req.io.of('/waiter').to('waiter:global').emit('order:ready', {
          kotId: parseInt(id),
          orderId: kot.order_id,
          tableId: kot.table_id,
        tableNumber: resolvedTableNumber,
          orderType: kot.order_type,
          onlinePlatform: kot.online_platform
        });
      }
    }

    res.json({ success: true });
  };

  module.exports = {
    getKot,
    getKotHistory,
    updateKotStatus
  };
