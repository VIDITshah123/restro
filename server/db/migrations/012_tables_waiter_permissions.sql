-- Migration 012: Tables soft-delete & custom slug, Waiter permissions and Google auth email

-- Tables updates
ALTER TABLE tables ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tables ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_slug ON tables(slug);

-- Waiters updates
ALTER TABLE waiters ADD COLUMN email TEXT;
ALTER TABLE waiters ADD COLUMN can_place_order INTEGER NOT NULL DEFAULT 1;
ALTER TABLE waiters ADD COLUMN can_cancel_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE waiters ADD COLUMN can_place_online_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE waiters ADD COLUMN can_place_takeaway_delivery INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_waiters_email ON waiters(email);

-- Orders & KOT waiter tracking
ALTER TABLE orders ADD COLUMN waiter_id INTEGER;
ALTER TABLE kot ADD COLUMN waiter_id INTEGER;
