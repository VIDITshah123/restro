const db = require('../db');

const getComprehensiveAnalytics = (req, res) => {
  const start = req.query.start;
  const end = req.query.end;

  let timeFilter = "AND 1=1";
  let params = [];
  
  if (start && end) {
    timeFilter = "AND placed_at >= ? AND placed_at <= ?";
    params = [`${start} 00:00:00`, `${end} 23:59:59`];
  } else if (start) {
    timeFilter = "AND placed_at >= ?";
    params = [`${start} 00:00:00`];
  } else if (end) {
    timeFilter = "AND placed_at <= ?";
    params = [`${end} 23:59:59`];
  }

  const today = new Date().toISOString().split('T')[0];
  const startOfDay = start ? `${start} 00:00:00` : `${today} 00:00:00`;
  const endOfDay = end ? `${end} 23:59:59` : null;

  try {
    // 1. High-Level Summary (All Time / Filtered Range)
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as totalOrders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE is_hidden = 0 ${timeFilter}
    `).get(...params);
    summary.avgOrderValue = summary.totalOrders > 0 ? (summary.revenue / summary.totalOrders).toFixed(2) : 0;

    let todaySummaryParams = [startOfDay];
    let todayFilter = "AND placed_at >= ?";
    if (endOfDay) {
      todayFilter += " AND placed_at <= ?";
      todaySummaryParams.push(endOfDay);
    }

    const todaySummary = db.prepare(`
      SELECT 
        COUNT(*) as totalOrders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE is_hidden = 0 ${todayFilter}
    `).get(...todaySummaryParams);

    // 2. Payment Method Breakdown
    const paymentBreakdown = db.prepare(`
      SELECT payment_method, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders
      FROM orders
      WHERE is_hidden = 0 AND status = 'billed'
      GROUP BY payment_method
    `).all();

    // 3. Profit & Margin Tracking (All time or filtered)
    const profitData = db.prepare(`
      SELECT 
        COALESCE(SUM(oi.price * oi.quantity), 0) as grossSales,
        COALESCE(SUM(oi.cost_price * oi.quantity), 0) as totalCost
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.is_hidden = 0 AND o.status = 'billed' ${timeFilter.replace(/placed_at/g, 'o.placed_at')}
    `).get(...params);
    profitData.netProfit = profitData.grossSales - profitData.totalCost;

    // Today Profit
    const todayProfitData = db.prepare(`
      SELECT 
        COALESCE(SUM(oi.price * oi.quantity), 0) as grossSales,
        COALESCE(SUM(oi.cost_price * oi.quantity), 0) as totalCost
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.is_hidden = 0 AND o.status = 'billed' ${todayFilter.replace(/placed_at/g, 'o.placed_at')}
    `).get(...todaySummaryParams);
    todayProfitData.netProfit = todayProfitData.grossSales - todayProfitData.totalCost;

    // 4. Dish Performance (Best & Least)
    const dishPerformance = db.prepare(`
      SELECT m.name, SUM(oi.quantity) as total_sold, COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.is_hidden = 0 ${timeFilter.replace(/placed_at/g, 'o.placed_at')}
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
      WHERE o.is_hidden = 0 ${timeFilter.replace(/placed_at/g, 'o.placed_at')}
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
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

const getTopDishes = (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const start = req.query.start;
    const end = req.query.end;

    let query = `
      SELECT m.name, SUM(oi.quantity) as total_sold, COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.is_hidden = 0
    `;
    const params = [];

    if (start) {
      query += ` AND o.placed_at >= ?`;
      params.push(`${start} 00:00:00`);
    }
    if (end) {
      // Inclusive of the end date
      query += ` AND o.placed_at <= ?`;
      params.push(`${end} 23:59:59`);
    }

    query += `
      GROUP BY m.id
      ORDER BY total_sold DESC
      LIMIT ?
    `;
    params.push(limit);

    const dishPerformance = db.prepare(query).all(...params);
    
    res.json({ success: true, data: dishPerformance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch top dishes' });
  }
};

module.exports = {
  getComprehensiveAnalytics,
  getTopDishes
};
