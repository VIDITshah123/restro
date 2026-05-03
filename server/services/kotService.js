const db = require('../db');

function generateKotNumber() {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  
  if (istTime.getUTCHours() < 4) {
    istTime.setUTCDate(istTime.getUTCDate() - 1);
  }
  
  istTime.setUTCHours(4, 0, 0, 0);
  
  const startUTC = new Date(istTime.getTime() - (5.5 * 60 * 60 * 1000));
  const startString = startUTC.toISOString().replace('T', ' ').substring(0, 19);

  const row = db.prepare(`
    SELECT COUNT(*) as count FROM kot WHERE generated_at >= ?
  `).get(startString);

  const seq = String(row.count + 1).padStart(3, '0');
  return `KOT-${seq}`;
}

module.exports = { generateKotNumber };
