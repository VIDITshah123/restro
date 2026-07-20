CREATE TABLE IF NOT EXISTS customer_reports (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id            INTEGER NOT NULL REFERENCES tables(id),
  type                TEXT    NOT NULL, -- food | other
  items               TEXT    DEFAULT '[]', -- JSON stringified array of items/issues
  description         TEXT    NOT NULL,
  status              TEXT    NOT NULL DEFAULT 'unread', -- unread | resolved
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at         TEXT    DEFAULT NULL,
  resolution_seconds  INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON customer_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_table  ON customer_reports(table_id);
