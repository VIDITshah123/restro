-- Link KOT to specific order items (so incremental KOTs only include NEW items)
CREATE TABLE IF NOT EXISTS kot_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kot_id INTEGER NOT NULL REFERENCES kot(id) ON DELETE CASCADE,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  UNIQUE(kot_id, order_item_id)
);
CREATE INDEX IF NOT EXISTS idx_kot_items_kot ON kot_items(kot_id);
CREATE INDEX IF NOT EXISTS idx_kot_items_order_item ON kot_items(order_item_id);
