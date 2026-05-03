const db = require('../db');

const getTodayAnalytics = (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today} 00:00:00`;
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as totalOrders,
      COALESCE(SUM(total_amount), 0) as revenue
    FROM orders
    WHERE placed_at >= ?
  `).get(startOfDay);
  
  stats.avgOrderValue = stats.totalOrders > 0 ? (stats.revenue / stats.totalOrders).toFixed(2) : 0;
  
  res.json({ success: true, data: stats });
};

const getRevenue = (req, res) => {
  // Simplistic last 7 days revenue
  const data = db.prepare(`
    SELECT date(placed_at) as date, SUM(total_amount) as revenue
    FROM orders
    WHERE placed_at >= datetime('now', '-7 days')
    GROUP BY date(placed_at)
    ORDER BY date ASC
  `).all();
  res.json({ success: true, data });
};

const getTopDishes = (req, res) => {
  const limit = req.query.limit || 5;
  const data = db.prepare(`
    SELECT m.name, SUM(oi.quantity) as total_sold
    FROM order_items oi
    JOIN menu_items m ON oi.menu_item_id = m.id
    JOIN orders o ON oi.order_id = o.id
    GROUP BY m.id
    ORDER BY total_sold DESC
    LIMIT ?
  `).all(limit);
  res.json({ success: true, data });
};

module.exports = {
  getTodayAnalytics,
  getRevenue,
  getTopDishes
};
