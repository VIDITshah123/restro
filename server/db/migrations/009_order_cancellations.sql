-- Add cancellation fields to order_items
ALTER TABLE order_items ADD COLUMN is_cancelled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN cancelled_at TEXT DEFAULT NULL;
ALTER TABLE order_items ADD COLUMN cancelled_reason TEXT DEFAULT NULL;
ALTER TABLE order_items ADD COLUMN cancelled_by_id INTEGER DEFAULT NULL;
ALTER TABLE order_items ADD COLUMN cancelled_by_role TEXT DEFAULT NULL;

-- Cancellation audit log table
CREATE TABLE IF NOT EXISTS order_item_cancellations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  order_item_id INTEGER NOT NULL REFERENCES order_items(id),
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  cancelled_by_id INTEGER NOT NULL,
  cancelled_by_name TEXT NOT NULL,
  cancelled_by_role TEXT NOT NULL,
  cancelled_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cancellations_order ON order_item_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_time ON order_item_cancellations(cancelled_at);
