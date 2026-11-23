-- ─────────────────────────────────────────
-- Staff Roster & Attendance & Overtime
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  role             TEXT    NOT NULL DEFAULT 'Staff',
  mobile_number    TEXT    NOT NULL,
  alt_number       TEXT    DEFAULT '',
  address          TEXT    DEFAULT '',
  salary_per_month REAL    NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,
  joined_date      TEXT    DEFAULT (date('now')),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id   INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date       TEXT    NOT NULL, -- YYYY-MM-DD
  status     TEXT    NOT NULL DEFAULT 'present', -- present | absent | half_day | leave
  check_in   TEXT    DEFAULT '',
  check_out  TEXT    DEFAULT '',
  notes      TEXT    DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(staff_id, date)
);

CREATE TABLE IF NOT EXISTS staff_overtime (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id      INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date          TEXT    NOT NULL, -- YYYY-MM-DD
  hours         REAL    NOT NULL DEFAULT 0,
  hourly_rate   REAL    NOT NULL DEFAULT 0,
  total_charges REAL    NOT NULL DEFAULT 0,
  reason        TEXT    DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_staff ON staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_overtime_date ON staff_overtime(date);
CREATE INDEX IF NOT EXISTS idx_overtime_staff ON staff_overtime(staff_id);
