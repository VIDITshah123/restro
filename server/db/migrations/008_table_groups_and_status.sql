-- Table groups (Indoor Dining, Outdoor, 1st Floor, etc.)
CREATE TABLE IF NOT EXISTS table_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add new columns to tables
ALTER TABLE tables ADD COLUMN status TEXT NOT NULL DEFAULT 'free';
-- status: 'free' | 'occupied' | 'hold'
ALTER TABLE tables ADD COLUMN group_id INTEGER REFERENCES table_groups(id);
ALTER TABLE tables ADD COLUMN capacity INTEGER DEFAULT 4;
ALTER TABLE tables ADD COLUMN merged_with_id INTEGER REFERENCES tables(id);

-- Add source to orders (staff vs qr_customer)
ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'staff';

-- Add customer_name to orders if not exists (may already exist from migration 007)
-- Use safe approach
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_group ON tables(group_id);
