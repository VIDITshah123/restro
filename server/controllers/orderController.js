const db = require('../db');
const kotService = require('../services/kotService');

const createOrder = (req, res) => {
  const {
    tableId,
    orderType = 'dine_in', // 'dine_in' | 'takeaway' | 'delivery'
    isOnline = false,
    onlinePlatform = '',
    customerName = '',
    customerPhone = '',
    customerAddress = '',
    items = [],
    notes = ''
  } = req.body;
  // items: [{ menuItemId, quantity, specialNotes, price, costPrice }]

  try {
    const maxRow = db.prepare('SELECT MAX(order_number) as max_num FROM orders WHERE is_hidden = 0').get();
    const orderNumber = (maxRow && maxRow.max_num) ? maxRow.max_num + 1 : 1;

    let effectiveTableId = tableId ? parseInt(tableId) : null;
    let effectiveTableNumber = 'Table';

    if (orderType === 'takeaway') {
      effectiveTableId = 9991;
      effectiveTableNumber = 'Takeaway';
    } else if (orderType === 'delivery') {
      effectiveTableId = 9992;
      effectiveTableNumber = 'Free Home Delivery';
    } else {
      if (!effectiveTableId) {
        return res.status(400).json({ success: false, message: 'Table ID is required for Dine-in orders.' });
      }
      const tableRow = db.prepare('SELECT table_number FROM tables WHERE id = ?').get(effectiveTableId);
      effectiveTableNumber = tableRow ? tableRow.table_number : `Table ${effectiveTableId}`;
    }

    // Generate unique session ID for takeaway/delivery or new sessions
    let sessionId = null;
    if (orderType === 'takeaway') {
      sessionId = `SESS-TKW-${Date.now()}`;
    } else if (orderType === 'delivery') {
      sessionId = `SESS-DEL-${Date.now()}`;
    }

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        table_id, total_amount, order_number, order_type,
        is_online, online_platform, customer_name, customer_phone,
        customer_address, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, quantity, price, cost_price, special_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let orderId;
    db.transaction(() => {
      const orderInfo = insertOrder.run(
        effectiveTableId,
        total_amount,
        orderNumber,
        orderType,
        isOnline ? 1 : 0,
        onlinePlatform || '',
        customerName || (orderType === 'dine_in' ? 'Guest' : ''),
        customerPhone || '',
        customerAddress || '',
        sessionId
      );
      orderId = orderInfo.lastInsertRowid;

      for (const item of items) {
        insertOrderItem.run(
          orderId,
          item.menuItemId || item.menu_item_id || item.id,
          item.quantity,
          item.price,
          item.costPrice || item.cost_price || 0,
          item.specialNotes || item.special_notes || ''
        );
      }

      // Generate KOT
      const kotNumber = kotService.generateKotNumber();
      db.prepare(`
        INSERT INTO kot (kot_number, order_id, table_id, status, order_type, online_platform)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(kotNumber, orderId, effectiveTableId, 'received', orderType, onlinePlatform || '');

      // Update table occupancy only for dine-in tables
      if (orderType === 'dine_in' && effectiveTableId !== 9991 && effectiveTableId !== 9992) {
        db.prepare('UPDATE tables SET is_occupied = 1 WHERE id = ?').run(effectiveTableId);
      }
    })();

    // Fetch the complete KOT to emit
    const kot = db.prepare('SELECT * FROM kot WHERE order_id = ?').get(orderId);
    kot.items = db.prepare(`
      SELECT oi.id, oi.quantity, oi.special_notes, oi.menu_item_id, m.name, m.is_veg 
      FROM order_items oi 
      JOIN menu_items m ON oi.menu_item_id = m.id 
      WHERE oi.order_id = ?
    `).all(orderId);

    kot.table_number = effectiveTableNumber;
    kot.tableNumber = effectiveTableNumber;
    kot.order_type = orderType;
    kot.is_online = isOnline ? 1 : 0;
    kot.online_platform = onlinePlatform || '';
    kot.customer_name = customerName;
    kot.customer_phone = customerPhone;
    kot.customer_address = customerAddress;

    if (req.io) {
      req.io.of('/kitchen').to('kitchen:global').emit('kot:new', kot);
      req.io.of('/admin').to('admin:global').emit('kot:new', kot);
      if (orderType === 'dine_in' && effectiveTableId !== 9991 && effectiveTableId !== 9992) {
        req.io.of('/admin').emit('table:statusChanged', { tableId: effectiveTableId, isOccupied: 1 });
      }
    }

    res.json({ success: true, data: { orderId, orderNumber, sessionId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrders = (req, res) => {
  const orders = db.prepare(`
    SELECT o.*,
      CASE
        WHEN o.order_type = 'takeaway' THEN 'Takeaway'
        WHEN o.order_type = 'delivery' THEN 'Free Home Delivery'
        ELSE COALESCE(t.table_number, 'Table ' || o.table_id)
      END as table_number,
      k.kot_number, k.status as kot_status
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN kot k ON o.id = k.order_id
    WHERE o.is_hidden = 0
    ORDER BY o.placed_at DESC
  `).all();
  res.json({ success: true, data: orders });
};

// ── Session Wise Grouping ─────────────────────────────────────────────────────
const getSessions = (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*,
        CASE
          WHEN o.order_type = 'takeaway' THEN 'Takeaway'
          WHEN o.order_type = 'delivery' THEN 'Free Home Delivery'
          ELSE COALESCE(t.table_number, 'Table ' || o.table_id)
        END as table_number,
        k.kot_number, k.status as kot_status
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN kot k ON o.id = k.order_id
      WHERE o.is_hidden = 0
      ORDER BY o.placed_at DESC
    `).all();

    // Fetch items for all orders
    const allItems = db.prepare(`
      SELECT oi.*, m.name, m.is_veg, m.category
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
    `).all();

    const itemsByOrder = {};
    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }

    // Group orders into sessions
    const sessionMap = new Map();

    for (const order of orders) {
      order.items = itemsByOrder[order.id] || [];

      // Determine session grouping key
      let sessionKey;
      if (order.session_id) {
        sessionKey = order.session_id;
      } else if (order.status === 'billed') {
        sessionKey = `SESS-${order.table_id}-${order.updated_at.replace(/[^0-9]/g, '')}`;
      } else {
        // Active orders:
        if (order.order_type === 'takeaway' || order.order_type === 'delivery') {
          sessionKey = `ACTIVE-${order.order_type.toUpperCase()}-${order.id}`;
        } else {
          sessionKey = `ACTIVE-TBL-${order.table_id}`;
        }
      }

      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          sessionId: sessionKey,
          tableId: order.table_id,
          tableNumber: order.table_number,
          orderType: order.order_type || 'dine_in',
          isOnline: order.is_online === 1,
          onlinePlatform: order.online_platform || '',
          customerName: order.customer_name || '',
          customerPhone: order.customer_phone || '',
          customerAddress: order.customer_address || '',
          status: order.status === 'billed' ? 'billed' : 'active',
          paymentMethod: order.payment_method || (order.status === 'billed' ? 'Cash' : 'Unpaid'),
          firstPlacedAt: order.placed_at,
          lastUpdatedAt: order.updated_at,
          orderCount: 0,
          orderIds: [],
          orderNumbers: [],
          totalAmount: 0,
          orders: [],
          consolidatedItemsMap: {}
        });
      }

      const session = sessionMap.get(sessionKey);
      session.orderCount += 1;
      session.orderIds.push(order.id);
      if (order.order_number) session.orderNumbers.push(order.order_number);
      session.totalAmount += order.total_amount;
      session.orders.push(order);

      // Track timings
      if (new Date(order.placed_at) < new Date(session.firstPlacedAt)) {
        session.firstPlacedAt = order.placed_at;
      }
      if (new Date(order.updated_at) > new Date(session.lastUpdatedAt)) {
        session.lastUpdatedAt = order.updated_at;
      }

      // Consolidate items
      for (const it of order.items) {
        const itemKey = `${it.name}_${it.special_notes || ''}`;
        if (!session.consolidatedItemsMap[itemKey]) {
          session.consolidatedItemsMap[itemKey] = {
            menuItemId: it.menu_item_id,
            name: it.name,
            is_veg: it.is_veg,
            special_notes: it.special_notes,
            price: it.price,
            quantity: 0,
            total: 0
          };
        }
        session.consolidatedItemsMap[itemKey].quantity += it.quantity;
        session.consolidatedItemsMap[itemKey].total += (it.price * it.quantity);
      }
    }

    // Convert map to array and format items
    const sessions = Array.from(sessionMap.values()).map(sess => {
      sess.items = Object.values(sess.consolidatedItemsMap);
      delete sess.consolidatedItemsMap;
      return sess;
    });

    // Sort by most recent placed_at descending
    sessions.sort((a, b) => new Date(b.firstPlacedAt) - new Date(a.firstPlacedAt));

    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrderById = (req, res) => {
  const { id } = req.params;
  const order = db.prepare(`
    SELECT o.*,
      CASE
        WHEN o.order_type = 'takeaway' THEN 'Takeaway'
        WHEN o.order_type = 'delivery' THEN 'Free Home Delivery'
        ELSE COALESCE(t.table_number, 'Table ' || o.table_id)
      END as table_number
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    WHERE o.id = ?
  `).get(id);

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.items = db.prepare(`
    SELECT oi.*, m.name, m.is_veg 
    FROM order_items oi 
    JOIN menu_items m ON oi.menu_item_id = m.id 
    WHERE oi.order_id = ?
  `).all(id);

  const kot = db.prepare('SELECT status, kot_number FROM kot WHERE order_id = ?').get(id);
  if (kot) {
    order.kot_status = kot.status;
    order.kot_number = kot.kot_number;
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
    const order = db.prepare('SELECT table_id, order_type FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    db.transaction(() => {
      db.prepare("UPDATE orders SET status = 'billed', updated_at = datetime('now') WHERE id = ?").run(id);
      if (order.order_type === 'dine_in' && order.table_id !== 9991 && order.table_id !== 9992) {
        db.prepare('UPDATE tables SET is_occupied = 0 WHERE id = ?').run(order.table_id);
      }
    })();

      if (req.io && order.order_type === 'dine_in' && order.table_id !== 9991 && order.table_id !== 9992) {
        req.io.of('/admin').emit('table:statusChanged', { tableId: order.table_id, isOccupied: 0 });
      }

      res.json({ success: true, message: 'Bill generated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  const requestBill = (req, res) => {
    const { id } = req.params;
    const order = db.prepare(`
    SELECT o.table_id,
      CASE
        WHEN o.order_type = 'takeaway' THEN 'Takeaway'
        WHEN o.order_type = 'delivery' THEN 'Free Home Delivery'
        ELSE COALESCE(t.table_number, 'Table ' || o.table_id)
      END as table_number
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    WHERE o.id = ?
  `).get(id);
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
  const getBillingForTable = (req, res) => {
    const { tableId } = req.params;
    const parsedTableId = parseInt(tableId);

    // Find the time of the last billing event for this table
    const lastBill = db.prepare(`
    SELECT MAX(updated_at) as last_billed
    FROM orders
    WHERE table_id = ? AND status = 'billed'
    `).get(parsedTableId);

  let orders;
  if (lastBill && lastBill.last_billed && parsedTableId !== 9991 && parsedTableId !== 9992) {
    orders = db.prepare(`
      SELECT o.*,
      CASE
          WHEN o.order_type = 'takeaway' THEN 'Takeaway'
          WHEN o.order_type = 'delivery' THEN 'Free Home Delivery'
          ELSE COALESCE(t.table_number, 'Table ' || o.table_id)
    END as table_number,
      k.status as kot_status
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN kot k ON o.id = k.order_id
      WHERE o.table_id = ? AND o.status != 'billed' AND o.placed_at > ?
      ORDER BY o.placed_at ASC
    `).all(parsedTableId, lastBill.last_billed);
  } else {
    orders = db.prepare(`
      SELECT o.*,
        CASE
          WHEN o.order_type = 'takeaway' THEN 'Takeaway'
          WHEN o.order_type = 'delivery' THEN 'Free Home Delivery'
          ELSE COALESCE(t.table_number, 'Table ' || o.table_id)
        END as table_number,
        k.status as kot_status
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN kot k ON o.id = k.order_id
      WHERE o.table_id = ? AND o.status != 'billed'
      ORDER BY o.placed_at ASC
  `).all(parsedTableId);
  }

  // Attach items to each order
  for (const order of orders) {
    order.items = db.prepare(`
      SELECT oi.*, m.name, m.is_veg 
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
    const parsedTableId = parseInt(tableId);
    const dateSlug = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const sessionId = `SESS - ${ parsedTableId } -${ dateSlug } `;

    db.transaction(() => {
      db.prepare(`
        UPDATE orders 
        SET status = 'billed',
    updated_at = datetime('now'),
    payment_method = ?,
    session_id = COALESCE(session_id, ?)
        WHERE table_id = ? AND status != 'billed'
    `).run(payment_method || 'Cash', sessionId, parsedTableId);

      if (parsedTableId !== 9991 && parsedTableId !== 9992) {
        db.prepare('UPDATE tables SET is_occupied = 0 WHERE id = ?').run(parsedTableId);
      }
    })();

    if (req.io) {
      if (parsedTableId !== 9991 && parsedTableId !== 9992) {
        req.io.of('/admin').emit('table:statusChanged', { tableId: parsedTableId, isOccupied: 0 });
      }
      req.io.of('/admin').emit('order:billed', { tableId: parsedTableId, sessionId });
    }

    res.json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Billing: Bill a single order (useful for Takeaway & Home Delivery) ─────────
const billSingleOrder = (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;

  try {
    const order = db.prepare('SELECT id, table_id, order_type, session_id FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const dateSlug = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const sessionId = order.session_id || `SESS - ${ order.order_type.toUpperCase() } -${ dateSlug } `;

    db.transaction(() => {
      db.prepare(`
        UPDATE orders
        SET status = 'billed',
    updated_at = datetime('now'),
    payment_method = ?,
    session_id = ?
      WHERE id = ?
        `).run(payment_method || 'Cash', sessionId, id);

      if (order.order_type === 'dine_in' && order.table_id !== 9991 && order.table_id !== 9992) {
        // Check if any other active orders exist for this table
        const remaining = db.prepare("SELECT count(*) as count FROM orders WHERE table_id = ? AND status != 'billed'").get(order.table_id);
        if (remaining.count === 0) {
          db.prepare('UPDATE tables SET is_occupied = 0 WHERE id = ?').run(order.table_id);
        }
      }
    })();

    if (req.io) {
      req.io.of('/admin').emit('order:billed', { orderId: id, sessionId });
    }

    res.json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearOrderHistory = (req, res) => {
  try {
    db.transaction(() => {
      // Find billed orders
      const billedOrders = db.prepare("SELECT id FROM orders WHERE status = 'billed'").all();
      if (billedOrders.length > 0) {
        const billedIds = billedOrders.map(o => o.id);
        const placeholders = billedIds.map(() => '?').join(',');

        // Delete associated KOTs and Order Items first (to respect foreign keys)
        db.prepare(`DELETE FROM kot WHERE order_id IN(${ placeholders })`).run(...billedIds);
        db.prepare(`DELETE FROM order_items WHERE order_id IN(${ placeholders })`).run(...billedIds);

        // Delete the billed orders
        db.prepare("DELETE FROM orders WHERE status = 'billed'").run();
      }

      // Reset sequences if tables are empty
      const ordersCount = db.prepare("SELECT COUNT(*) as count FROM orders").get().count;
      if (ordersCount === 0) {
        db.prepare("DELETE FROM sqlite_sequence WHERE name='orders'").run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name='order_items'").run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name='kot'").run();
      }
    })();
    res.json({ success: true, message: 'Order history fully cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearKotHistory = (req, res) => {
  try {
    db.transaction(() => {
      db.prepare("DELETE FROM kot WHERE status = 'served'").run();
      const kotCount = db.prepare("SELECT COUNT(*) as count FROM kot").get().count;
      if (kotCount === 0) {
        db.prepare("DELETE FROM sqlite_sequence WHERE name='kot'").run();
      }
    })();
    res.json({ success: true, message: 'KOT history fully cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Billing: Get all pending billable targets (occupied tables + unbilled takeaway/delivery)
const getPendingBills = (req, res) => {
  try {
    const tables = db.prepare(`
      SELECT t.id, t.table_number,
    (SELECT COUNT(*) FROM orders o WHERE o.table_id = t.id AND o.status != 'billed') as order_count,
      (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.table_id = t.id AND o.status != 'billed') as total_amount
      FROM tables t
      WHERE t.is_occupied = 1 AND t.id NOT IN(9991, 9992)
      ORDER BY t.table_number ASC
    `).all();

    const directOrders = db.prepare(`
      SELECT o.*,
    CASE
          WHEN o.order_type = 'takeaway' THEN 'Takeaway'
          WHEN o.order_type = 'delivery' THEN 'Free Home Delivery'
          ELSE COALESCE(t.table_number, 'Table ' || o.table_id)
  END as table_number,
    k.status as kot_status
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN kot k ON o.id = k.order_id
      WHERE o.order_type IN('takeaway', 'delivery') AND o.status != 'billed'
      ORDER BY o.placed_at DESC
    `).all();

    for (const ord of directOrders) {
      ord.items = db.prepare(`
        SELECT oi.*, m.name, m.is_veg
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ?
    `).all(ord.id);
    }

    res.json({
      success: true,
      data: {
        tables,
        directOrders
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getSessions,
  getOrderById,
  updateOrderStatus,
  generateBill,
  generateTableBill,
  billSingleOrder,
  requestBill,
  requestBillByTable,
  getBillingForTable,
  getPendingBills,
  clearOrderHistory,
  clearKotHistory,
};
