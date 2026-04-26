const db = require('../db');

const getMenu = (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items').all();
  res.json({ success: true, data: items });
};

const getCategories = (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM menu_items').all().map(r => r.category);
  res.json({ success: true, data: categories });
};

const createMenuItem = (req, res) => {
  const { name, description, price, category, image_url, is_veg, tags, is_available } = req.body;
  const insert = db.prepare(`
    INSERT INTO menu_items (name, description, price, category, image_url, is_veg, tags, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(
    name, description, price, category, image_url, 
    is_veg !== undefined ? is_veg : 1, 
    tags || '[]', 
    is_available !== undefined ? is_available : 1
  );
  res.json({ success: true, data: { id: info.lastInsertRowid } });
};

const updateMenuItem = (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, image_url, is_veg, tags, is_available } = req.body;
  const update = db.prepare(`
    UPDATE menu_items 
    SET name=?, description=?, price=?, category=?, image_url=?, is_veg=?, tags=?, is_available=?, updated_at=datetime('now')
    WHERE id=?
  `);
  update.run(name, description, price, category, image_url, is_veg, tags, is_available, id);
  res.json({ success: true });
};

const deleteMenuItem = (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM menu_items WHERE id=?').run(id);
  res.json({ success: true });
};

const toggleAvailability = (req, res) => {
  const { id } = req.params;
  const { is_available } = req.body;
  db.prepare("UPDATE menu_items SET is_available=?, updated_at=datetime('now') WHERE id=?").run(is_available, id);
  
  // Emitting to socket will be handled in the route or imported io
  if (req.io) {
    req.io.of('/customer').emit('menu:updated', { itemId: parseInt(id), isAvailable: is_available });
  }

  res.json({ success: true });
};

module.exports = {
  getMenu,
  getCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
};
