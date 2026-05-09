const db = require('../db');

const getMenu = (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items WHERE is_hidden = 0').all();
  res.json({ success: true, data: items });
};

const getCategories = (req, res) => {
  const categories = db.prepare(`
    SELECT DISTINCT m.category as name, COALESCE(c.sort_order, 999) as sort_order 
    FROM menu_items m 
    LEFT JOIN categories c ON m.category = c.name 
    WHERE m.is_hidden = 0
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
  try {
    // Try to physically delete first
    db.prepare('DELETE FROM menu_items WHERE id=?').run(id);
  } catch (err) {
    // If it fails due to constraint (e.g., ordered before), soft delete
    db.prepare("UPDATE menu_items SET is_hidden = 1, updated_at=datetime('now') WHERE id=?").run(id);
  }
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

const bulkImportMenu = (req, res) => {
  const { items } = req.body;
  const insertItem = db.prepare(`
    INSERT INTO menu_items (name, description, price, cost_price, category, is_veg, tags, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const checkItem = db.prepare(`SELECT id FROM menu_items WHERE name COLLATE NOCASE = ? AND is_hidden = 0`);
  const insertVariant = db.prepare(`INSERT INTO menu_item_variants (menu_item_id, name, price, cost_price) VALUES (?, ?, ?, ?)`);
  const checkVariant = db.prepare(`SELECT id FROM menu_item_variants WHERE menu_item_id = ? AND name COLLATE NOCASE = ?`);

  const results = { imported: 0, skipped: 0, errors: [] };

  db.transaction(() => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.name || item.price === undefined || !item.category) {
          results.errors.push(`Row ${i+2}: Missing required fields (Name, Price, Category)`);
          continue;
        }

        const existing = checkItem.get(item.name);
        let itemId;
        if (existing) {
          itemId = existing.id;
          results.skipped++;
        } else {
          const info = insertItem.run(
            item.name, item.description || '', parseFloat(item.price), 
            parseFloat(item.cost_price) || 0, item.category, 
            item.is_veg !== undefined ? parseInt(item.is_veg) : 1, 
            item.tags || '[]'
          );
          itemId = info.lastInsertRowid;
          results.imported++;
        }

        if (item.variants && Array.isArray(item.variants)) {
          for (const v of item.variants) {
            if (!v.name || v.price === undefined) continue;
            const existingVar = checkVariant.get(itemId, v.name);
            if (!existingVar) {
              insertVariant.run(itemId, v.name, parseFloat(v.price), parseFloat(v.cost_price || 0));
            }
          }
        }
      } catch (err) {
        results.errors.push(`Row ${i+2} (${item.name || 'Unknown'}): ${err.message}`);
      }
    }
  })();

  res.json({ success: true, data: results });
};

module.exports = {
  getMenu,
  getCategories,
  updateCategoryOrder,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  bulkImportMenu
};
