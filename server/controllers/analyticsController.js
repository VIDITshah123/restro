const db = require('../db');

const getComprehensiveAnalytics = (req, res) => {
  const { dateRange } = req.query; // optional, can implement later
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today} 00:00:00`;

  try {
    // 1. High-Level Summary
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as totalOrders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE is_hidden = 0
    `).get();
    summary.avgOrderValue = summary.totalOrders > 0 ? (summary.revenue / summary.totalOrders).toFixed(2) : 0;

    // Today's summary
    const todaySummary = db.prepare(`
      SELECT 
        COUNT(*) as totalOrders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE is_hidden = 0 AND placed_at >= ?
    `).get(startOfDay);

    // 2. Payment Method Breakdown
    const paymentBreakdown = db.prepare(`
      SELECT payment_method, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders
      FROM orders
      WHERE is_hidden = 0 AND status = 'billed'
      GROUP BY payment_method
    `).all();

    // 3. Profit & Margin Tracking (All time)
    // Revenue is sum of oi.price * oi.quantity
    // Cost is sum of m.cost_price * oi.quantity
    const profitData = db.prepare(`
      SELECT 
        COALESCE(SUM(oi.price * oi.quantity), 0) as grossSales,
        COALESCE(SUM(m.cost_price * oi.quantity), 0) as totalCost
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.is_hidden = 0 AND o.status = 'billed'
    `).get();
    profitData.netProfit = profitData.grossSales - profitData.totalCost;

    // Today Profit
    const todayProfitData = db.prepare(`
      SELECT 
        COALESCE(SUM(oi.price * oi.quantity), 0) as grossSales,
        COALESCE(SUM(m.cost_price * oi.quantity), 0) as totalCost
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.is_hidden = 0 AND o.status = 'billed' AND o.placed_at >= ?
    `).get(startOfDay);
    todayProfitData.netProfit = todayProfitData.grossSales - todayProfitData.totalCost;

    // 4. Dish Performance (Best & Least)
    const dishPerformance = db.prepare(`
      SELECT m.name, SUM(oi.quantity) as total_sold, COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.is_hidden = 0
      GROUP BY m.id
      ORDER BY total_sold DESC
    `).all();

    const topDishes = dishPerformance.slice(0, 5);
    const leastDishes = dishPerformance.slice(-5).reverse(); // bottom 5

    // 5. Category-wise performance
    const categoryPerformance = db.prepare(`
      SELECT m.category, SUM(oi.quantity) as total_sold, COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.is_hidden = 0
      GROUP BY m.category
      ORDER BY revenue DESC
    `).all();

    // 6. Last 7 Days Revenue
    const revenue7Days = db.prepare(`
      SELECT date(placed_at) as date, SUM(total_amount) as revenue
      FROM orders
      WHERE placed_at >= datetime('now', '-7 days') AND is_hidden = 0
      GROUP BY date(placed_at)
      ORDER BY date ASC
    `).all();

    res.json({
      success: true,
      data: {
        summary,
        todaySummary,
        paymentBreakdown,
        profitData,
        todayProfitData,
        topDishes,
        leastDishes,
        categoryPerformance,
        revenue7Days
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getComprehensiveAnalytics
};
