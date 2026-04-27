const db = require('../db');

// ── Get all variants for an item ──────────────────────────────────────────────
const getVariants = (req, res) => {
  const { id } = req.params; // menu_item_id
  const variants = db.prepare('SELECT * FROM menu_item_variants WHERE menu_item_id = ? ORDER BY price ASC').all(id);
  res.json({ success: true, data: variants });
};

// ── Create variant ────────────────────────────────────────────────────────────
const createVariant = (req, res) => {
  const { id } = req.params; // menu_item_id
  const { name, price } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ success: false, message: 'name and price required' });
  }
  const info = db.prepare('INSERT INTO menu_item_variants (menu_item_id, name, price) VALUES (?, ?, ?)').run(id, name, price);
  res.json({ success: true, data: { id: info.lastInsertRowid } });
};

// ── Update variant ────────────────────────────────────────────────────────────
const updateVariant = (req, res) => {
  const { variantId } = req.params;
  const { name, price } = req.body;
  db.prepare('UPDATE menu_item_variants SET name=?, price=? WHERE id=?').run(name, price, variantId);
  res.json({ success: true });
};

// ── Delete variant ────────────────────────────────────────────────────────────
const deleteVariant = (req, res) => {
  const { variantId } = req.params;
  db.prepare('DELETE FROM menu_item_variants WHERE id=?').run(variantId);
  res.json({ success: true });
};

// ── Get full menu with variants ───────────────────────────────────────────────
const getMenuWithVariants = (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items ORDER BY category, name').all();
  const variants = db.prepare('SELECT * FROM menu_item_variants ORDER BY price ASC').all();

  // Attach variants to their parent items
  const variantMap = {};
  for (const v of variants) {
    if (!variantMap[v.menu_item_id]) variantMap[v.menu_item_id] = [];
    variantMap[v.menu_item_id].push(v);
  }

  const result = items.map(item => ({
    ...item,
    variants: variantMap[item.id] || []
  }));

  res.json({ success: true, data: result });
};

module.exports = { getVariants, createVariant, updateVariant, deleteVariant, getMenuWithVariants };
