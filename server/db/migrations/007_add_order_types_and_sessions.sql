-- Add order types, online platform, and session fields to orders
ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN is_online INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN online_platform TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN session_id TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN customer_phone TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN customer_address TEXT DEFAULT '';

-- Add order type and online platform to kot
ALTER TABLE kot ADD COLUMN order_type TEXT NOT NULL DEFAULT 'dine_in';
ALTER TABLE kot ADD COLUMN online_platform TEXT DEFAULT '';

-- Add virtual system tables for Takeaway and Free Home Delivery
INSERT OR IGNORE INTO tables (id, table_number, is_occupied) VALUES (9991, 'Takeaway', 0);
INSERT OR IGNORE INTO tables (id, table_number, is_occupied) VALUES (9992, 'Free Home Delivery', 0);

-- Create index for session_id on orders
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

