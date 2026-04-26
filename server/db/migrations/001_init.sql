-- Enable WAL mode for concurrent access
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  table_number TEXT    NOT NULL UNIQUE,
  qr_code_url  TEXT,
  is_occupied  INTEGER NOT NULL DEFAULT 0,   -- 0 = free, 1 = occupied
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- Menu Items
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  description  TEXT,
  price        REAL    NOT NULL,
  category     TEXT    NOT NULL,
  image_url    TEXT,
  is_veg       INTEGER NOT NULL DEFAULT 1,    -- 1 = veg, 0 = non-veg
  tags         TEXT    DEFAULT '[]',           -- JSON array: ["Jain","Vegan","Spicy"]
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id     INTEGER NOT NULL REFERENCES tables(id),
  status       TEXT    NOT NULL DEFAULT 'placed',
    -- placed | preparing | ready | served
  total_amount REAL    NOT NULL DEFAULT 0,
  placed_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id   INTEGER NOT NULL REFERENCES menu_items(id),
  quantity       INTEGER NOT NULL DEFAULT 1,
  special_notes  TEXT    DEFAULT ''
);

-- ─────────────────────────────────────────
-- Kitchen Order Tickets (KOT)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kot (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kot_number   TEXT    NOT NULL,         -- e.g. "KOT-007" — resets daily
  order_id     INTEGER NOT NULL REFERENCES orders(id),
  table_id     INTEGER NOT NULL REFERENCES tables(id),
  status       TEXT    NOT NULL DEFAULT 'received',
    -- received | accepted | preparing | ready | served
  generated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- Admins
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'admin',   -- admin | manager
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Create Key Indexes (use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table      ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at  ON orders(placed_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_kot_status        ON kot(status);
CREATE INDEX IF NOT EXISTS idx_kot_order         ON kot(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_category     ON menu_items(category, is_available);
