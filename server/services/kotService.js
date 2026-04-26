const db = require('../db');

function generateKotNumber() {
  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today} 00:00:00`;

  const row = db.prepare(`
    SELECT COUNT(*) as count FROM kot WHERE generated_at >= ?
  `).get(todayStart);

  const seq = String(row.count + 1).padStart(3, '0');
  return `KOT-${seq}`;
}

module.exports = { generateKotNumber };
