const db = require('../db');

const getMenu = (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items').all();
  res.json({ success: true, data: items });
};

const getCategories = (req, res) => {
  const categories = db.prepare(`
    SELECT DISTINCT m.category as name, COALESCE(c.sort_order, 999) as sort_order 
    FROM menu_items m 
    LEFT JOIN categories c ON m.category = c.name 
    ORDER BY sort_order ASC, m.category ASC
  `).all().map(r => r.name);
  res.json({ success: true, data: categories });
};

const updateCategoryOrder = (req, res) => {
  const { categories } = req.body;
  const insert = db.prepare(`
    INSERT INTO categories (name, sort_order) 
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET sort_order=excluded.sort_order
  `);
  
  db.transaction(() => {
    categories.forEach((name, index) => {
      insert.run(name, index);
    });
  })();
  
  res.json({ success: true });
};

const createMenuItem = (req, res) => {
  const { name, description, price, cost_price, category, image_url, is_veg, tags, is_available } = req.body;
  const insert = db.prepare(`
    INSERT INTO menu_items (name, description, price, cost_price, category, image_url, is_veg, tags, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(
    name, description, price, cost_price || 0, category, image_url, 
    is_veg !== undefined ? is_veg : 1, 
    tags || '[]', 
    is_available !== undefined ? is_available : 1
  );
  res.json({ success: true, data: { id: info.lastInsertRowid } });
};

const updateMenuItem = (req, res) => {
  const { id } = req.params;
  const { name, description, price, cost_price, category, image_url, is_veg, tags, is_available } = req.body;
  const update = db.prepare(`
    UPDATE menu_items 
    SET name=?, description=?, price=?, cost_price=?, category=?, image_url=?, is_veg=?, tags=?, is_available=?, updated_at=datetime('now')
    WHERE id=?
  `);
  update.run(name, description, price, cost_price || 0, category, image_url, is_veg, tags, is_available, id);
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
  updateCategoryOrder,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
};
