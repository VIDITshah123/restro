const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// ── Admin: List all waiters ──────────────────────────────────────────────────
const getWaiters = (req, res) => {
  const waiters = db.prepare('SELECT id, name, userid, is_active, created_at FROM waiters ORDER BY created_at DESC').all();
  res.json({ success: true, data: waiters });
};

// ── Admin: Create waiter ─────────────────────────────────────────────────────
const createWaiter = async (req, res) => {
  const { name, userid, password } = req.body;
  if (!name || !userid || !password) {
    return res.status(400).json({ success: false, message: 'name, userid and password are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const info = db.prepare('INSERT INTO waiters (name, userid, password_hash) VALUES (?, ?, ?)').run(name, userid, hash);
    res.json({ success: true, data: { id: info.lastInsertRowid } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'User ID already exists' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Admin: Update waiter ─────────────────────────────────────────────────────
const updateWaiter = async (req, res) => {
  const { id } = req.params;
  const { name, userid, password, is_active } = req.body;
  const waiter = db.prepare('SELECT * FROM waiters WHERE id = ?').get(id);
  if (!waiter) return res.status(404).json({ success: false, message: 'Waiter not found' });

  const newName = name || waiter.name;
  const newUserid = userid || waiter.userid;
  const newActive = is_active !== undefined ? is_active : waiter.is_active;
  const newHash = password ? await bcrypt.hash(password, 10) : waiter.password_hash;

  db.prepare('UPDATE waiters SET name=?, userid=?, password_hash=?, is_active=? WHERE id=?').run(newName, newUserid, newHash, newActive, id);
  res.json({ success: true });
};

// ── Admin: Delete waiter ─────────────────────────────────────────────────────
const deleteWaiter = (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM waiters WHERE id=?').run(id);
  res.json({ success: true });
};

// ── Waiter: Login ─────────────────────────────────────────────────────────────
const waiterLogin = async (req, res) => {
  const { userid, password } = req.body;
  if (!userid || !password) {
    return res.status(400).json({ success: false, message: 'userid and password required' });
  }
  const waiter = db.prepare('SELECT * FROM waiters WHERE userid = ? AND is_active = 1').get(userid);
  if (!waiter) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, waiter.password_hash);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = jwt.sign({ id: waiter.id, role: 'waiter', name: waiter.name }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ success: true, data: { token, role: 'waiter', name: waiter.name } });
};

module.exports = { getWaiters, createWaiter, updateWaiter, deleteWaiter, waiterLogin };
