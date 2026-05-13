const db = require('better-sqlite3')('./data/restaurant.db');
try {
  db.prepare('ALTER TABLE order_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0').run();
  db.prepare('UPDATE order_items SET cost_price = (SELECT cost_price FROM menu_items WHERE id = order_items.menu_item_id) WHERE cost_price = 0').run();
  console.log('Database successfully updated!');
} catch(e) {
  console.log('Update already applied or error:', e.message);
}
