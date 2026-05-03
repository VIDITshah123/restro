const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'restaurant.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: console.log });

// Enable WAL mode for concurrent access and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Simple migration runner
const runMigrations = () => {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();
  
  // We should track applied migrations, but for simplicity here we just run them if tables don't exist
  // We'll rely on IF NOT EXISTS in our SQL
  for (const file of files) {
    if (file.endsWith('.sql')) {
      try {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        db.exec(sql);
        console.log(`Executed migration: ${file}`);
      } catch (err) {
        if (!err.message.includes('duplicate column name')) {
          console.error(`Migration error in ${file}:`, err);
        }
      }
    }
  }
};

runMigrations();

module.exports = db;
