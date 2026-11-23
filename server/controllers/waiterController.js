const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Helper to decode / extract email from Google credential token or raw email
const parseGoogleCredential = (credential, email) => {
  if (email && typeof email === 'string' && email.includes('@')) {
    return email.trim().toLowerCase();
  }
  if (credential && typeof credential === 'string') {
    try {
      // Decode JWT payload (part 1)
      const parts = credential.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        const parsed = JSON.parse(payloadJson);
        if (parsed.email) {
          return parsed.email.trim().toLowerCase();
        }
      }
    } catch (e) {
      console.warn('Could not parse Google credential JWT:', e.message);
    }
  }
  return null;
};

// ── Admin: List all waiters ──────────────────────────────────────────────────
const getWaiters = (req, res) => {
  const waiters = db.prepare(`
    SELECT id, name, userid, email, is_active,
           COALESCE(can_place_order, 1) as can_place_order,
           COALESCE(can_cancel_order, 0) as can_cancel_order,
           COALESCE(can_place_online_order, 0) as can_place_online_order,
           COALESCE(can_place_takeaway_delivery, 0) as can_place_takeaway_delivery,
           created_at 
    FROM waiters 
    ORDER BY created_at DESC
  `).all();
  res.json({ success: true, data: waiters });
};

// ── Admin: Create waiter ─────────────────────────────────────────────────────
const createWaiter = async (req, res) => {
  const {
    name,
    email,
    userid,
    password,
    can_place_order = 1,
    can_cancel_order = 0,
    can_place_online_order = 0,
    can_place_takeaway_delivery = 0
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Waiter name is required' });
  }

  // Admin provides email id for Google Auth
  const effectiveEmail = email ? email.trim().toLowerCase() : null;
  const effectiveUserId = (userid && userid.trim()) ? userid.trim() : (effectiveEmail ? effectiveEmail.split('@')[0] : `waiter_${Date.now()}`);
  const passToHash = password || Math.random().toString(36).slice(-8);

  try {
    const hash = await bcrypt.hash(passToHash, 10);
    const info = db.prepare(`
      INSERT INTO waiters (
        name, userid, email, password_hash, is_active,
        can_place_order, can_cancel_order, can_place_online_order, can_place_takeaway_delivery
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      name.trim(),
      effectiveUserId,
      effectiveEmail,
      hash,
      can_place_order ? 1 : 0,
      can_cancel_order ? 1 : 0,
      can_place_online_order ? 1 : 0,
      can_place_takeaway_delivery ? 1 : 0
    );

    const created = db.prepare('SELECT * FROM waiters WHERE id = ?').get(info.lastInsertRowid);
    res.json({ success: true, data: created });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'User ID or Email already registered for another waiter' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Admin: Update waiter ─────────────────────────────────────────────────────
const updateWaiter = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    userid,
    password,
    is_active,
    can_place_order,
    can_cancel_order,
    can_place_online_order,
    can_place_takeaway_delivery
  } = req.body;

  const waiter = db.prepare('SELECT * FROM waiters WHERE id = ?').get(id);
  if (!waiter) return res.status(404).json({ success: false, message: 'Waiter not found' });

  const newName = name !== undefined ? name.trim() : waiter.name;
  const newEmail = email !== undefined ? (email ? email.trim().toLowerCase() : null) : waiter.email;
  const newUserid = userid !== undefined ? userid.trim() : waiter.userid;
  const newActive = is_active !== undefined ? (is_active ? 1 : 0) : waiter.is_active;
  const newCanPlaceOrder = can_place_order !== undefined ? (can_place_order ? 1 : 0) : waiter.can_place_order;
  const newCanCancelOrder = can_cancel_order !== undefined ? (can_cancel_order ? 1 : 0) : waiter.can_cancel_order;
  const newCanPlaceOnline = can_place_online_order !== undefined ? (can_place_online_order ? 1 : 0) : waiter.can_place_online_order;
  const newCanPlaceTakeaway = can_place_takeaway_delivery !== undefined ? (can_place_takeaway_delivery ? 1 : 0) : waiter.can_place_takeaway_delivery;
  const newHash = password ? await bcrypt.hash(password, 10) : waiter.password_hash;

  try {
    db.prepare(`
      UPDATE waiters 
      SET name=?, userid=?, email=?, password_hash=?, is_active=?,
          can_place_order=?, can_cancel_order=?, can_place_online_order=?, can_place_takeaway_delivery=?
      WHERE id=?
    `).run(
      newName, newUserid, newEmail, newHash, newActive,
      newCanPlaceOrder, newCanCancelOrder, newCanPlaceOnline, newCanPlaceTakeaway,
      id
    );

    res.json({ success: true, message: 'Waiter updated successfully.' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'User ID or Email already exists for another account.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Admin: Delete waiter ─────────────────────────────────────────────────────
const deleteWaiter = (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM waiters WHERE id=?').run(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Waiter: Google OAuth Login (Task 8 & 9) ──────────────────────────────────
const googleWaiterLogin = async (req, res) => {
  const { credential, email } = req.body;
  const targetEmail = parseGoogleCredential(credential, email);

  if (!targetEmail) {
    return res.status(400).json({ success: false, message: 'Valid Google email is required.' });
  }

  const waiter = db.prepare('SELECT * FROM waiters WHERE LOWER(email) = LOWER(?)').get(targetEmail);

  if (!waiter) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Email "${targetEmail}" is not registered by the Admin for Waiter access.`
    });
  }

  if (!waiter.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Your waiter account has been deactivated by the Admin.'
    });
  }

  const permissions = {
    can_place_order: Boolean(waiter.can_place_order !== 0),
    can_cancel_order: Boolean(waiter.can_cancel_order),
    can_place_online_order: Boolean(waiter.can_place_online_order),
    can_place_takeaway_delivery: Boolean(waiter.can_place_takeaway_delivery)
  };

  const token = jwt.sign(
    { id: waiter.id, role: 'waiter', name: waiter.name, email: waiter.email, permissions },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    success: true,
    data: {
      token,
      role: 'waiter',
      name: waiter.name,
      email: waiter.email,
      waiterId: waiter.id,
      permissions
    }
  });
};

// ── Waiter: Legacy ID/Password Login ─────────────────────────────────────────
const waiterLogin = async (req, res) => {
  const { userid, password } = req.body;
  if (!userid || !password) {
    return res.status(400).json({ success: false, message: 'userid and password required' });
  }
  const waiter = db.prepare('SELECT * FROM waiters WHERE (userid = ? OR LOWER(email) = LOWER(?)) AND is_active = 1').get(userid, userid);
  if (!waiter) return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });

  const isMatch = await bcrypt.compare(password, waiter.password_hash);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const permissions = {
    can_place_order: Boolean(waiter.can_place_order !== 0),
    can_cancel_order: Boolean(waiter.can_cancel_order),
    can_place_online_order: Boolean(waiter.can_place_online_order),
    can_place_takeaway_delivery: Boolean(waiter.can_place_takeaway_delivery)
  };

  const token = jwt.sign(
    { id: waiter.id, role: 'waiter', name: waiter.name, email: waiter.email, permissions },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({
    success: true,
    data: {
      token,
      role: 'waiter',
      name: waiter.name,
      email: waiter.email,
      waiterId: waiter.id,
      permissions
    }
  });
};

// ── Waiter: Get Live Orders Placed by Waiter (Task 10 KDS Overview) ───────────
const getWaiterLiveOrders = (req, res) => {
  try {
    const waiterId = req.user?.id;
    let query = `
      SELECT o.*,
        CASE
          WHEN o.order_type = 'takeaway' THEN 'Takeaway'
          WHEN o.order_type = 'delivery' THEN 'Free Home Delivery'
          WHEN t.is_deleted = 1 THEN COALESCE(t.table_number, 'Table ' || o.table_id) || ' (Deleted)'
          ELSE COALESCE(t.table_number, 'Table ' || o.table_id)
        END as table_number,
        k.id as kot_id, k.kot_number, k.status as kot_status, k.generated_at
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN kot k ON o.id = k.order_id
      WHERE o.is_hidden = 0
    `;
    const params = [];
    if (waiterId) {
      query += ` AND (o.waiter_id = ? OR k.waiter_id = ?)`;
      params.push(waiterId, waiterId);
    }
    query += ` ORDER BY o.placed_at DESC LIMIT 60`;
    const orders = db.prepare(query).all(...params);

    for (const ord of orders) {
      ord.items = db.prepare(`
        SELECT oi.*, m.name, m.is_veg
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ?
      `).all(ord.id);
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWaiters,
  createWaiter,
  updateWaiter,
  deleteWaiter,
  waiterLogin,
  googleWaiterLogin,
  getWaiterLiveOrders
};
