const db = require('../db');

// Create a report
const createReport = (req, res) => {
  const { tableId, type, items, description } = req.body;

  if (!tableId) {
    return res.status(400).json({ error: 'Table ID is required' });
  }

  if (!type || !['food', 'other'].includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing report type' });
  }

  if (!description || description.trim().length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters long' });
  }

  try {
    const parsedTableId = parseInt(tableId);

    // Prevent duplicate food reports for the same items within 15 minutes
    if (type === 'food' && Array.isArray(items) && items.length > 0) {
      const activeReports = db.prepare(`
        SELECT items FROM customer_reports 
        WHERE table_id = ? AND type = 'food' AND status = 'unread'
        AND datetime(created_at) >= datetime('now', '-15 minutes')
      `).all(parsedTableId);

      for (const report of activeReports) {
        let existingItems = [];
        try {
          existingItems = JSON.parse(report.items);
        } catch (e) {}

        const overlap = items.some(item => 
          existingItems.some(ex => ex.name === item.name)
        );

        if (overlap) {
          return res.status(400).json({ error: 'You have already reported an issue for this item recently.' });
        }
      }
    }

    // Prevent duplicate general issues for the same description within 15 minutes
    if (type === 'other') {
      const activeOther = db.prepare(`
        SELECT id FROM customer_reports
        WHERE table_id = ? AND type = 'other' AND status = 'unread'
        AND description = ?
        AND datetime(created_at) >= datetime('now', '-15 minutes')
      `).get(parsedTableId, description.trim());

      if (activeOther) {
        return res.status(400).json({ error: 'This issue has already been reported recently.' });
      }
    }

    const insertStmt = db.prepare(`
      INSERT INTO customer_reports (table_id, type, items, description, status, created_at)
      VALUES (?, ?, ?, ?, 'unread', datetime('now'))
    `);

    const info = insertStmt.run(
      parsedTableId, 
      type, 
      JSON.stringify(items || []), 
      description.trim()
    );

    const reportId = info.lastInsertRowid;

    const report = db.prepare(`
      SELECT r.*, t.table_number 
      FROM customer_reports r
      JOIN tables t ON r.table_id = t.id
      WHERE r.id = ?
    `).get(reportId);

    // Broadcast in real-time
    req.io.of('/admin').to('admin:global').emit('report:new', report);

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get active (unread) reports
const getActiveReports = (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT r.*, t.table_number 
      FROM customer_reports r
      JOIN tables t ON r.table_id = t.id
      WHERE r.status = 'unread'
      ORDER BY r.created_at DESC
    `).all();
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('Error fetching active reports:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get reports history (resolved)
const getReportsHistory = (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT r.*, t.table_number 
      FROM customer_reports r
      JOIN tables t ON r.table_id = t.id
      WHERE r.status = 'resolved'
      ORDER BY r.resolved_at DESC
    `).all();
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('Error fetching reports history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get active reports for a specific table (useful for Billing page alerts)
const getActiveReportsByTable = (req, res) => {
  const { tableId } = req.params;
  try {
    const reports = db.prepare(`
      SELECT r.*, t.table_number 
      FROM customer_reports r
      JOIN tables t ON r.table_id = t.id
      WHERE r.table_id = ? AND r.status = 'unread'
      ORDER BY r.created_at DESC
    `).all(parseInt(tableId));
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('Error fetching table reports:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Resolve a report
const resolveReport = (req, res) => {
  const { id } = req.params;
  try {
    const reportId = parseInt(id);
    const report = db.prepare('SELECT created_at FROM customer_reports WHERE id = ?').get(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const resolvedAt = new Date().toISOString();
    const createdTime = new Date(report.created_at).getTime();
    const resolvedTime = new Date(resolvedAt).getTime();
    const resolutionSeconds = Math.max(0, Math.floor((resolvedTime - createdTime) / 1000));

    const updateStmt = db.prepare(`
      UPDATE customer_reports 
      SET status = 'resolved', resolved_at = ?, resolution_seconds = ?
      WHERE id = ?
    `);
    updateStmt.run(resolvedAt, resolutionSeconds, reportId);

    const updatedReport = db.prepare(`
      SELECT r.*, t.table_number 
      FROM customer_reports r
      JOIN tables t ON r.table_id = t.id
      WHERE r.id = ?
    `).get(reportId);

    // Broadcast in real-time
    req.io.of('/admin').to('admin:global').emit('report:resolved', updatedReport);

    res.json({ success: true, data: updatedReport });
  } catch (err) {
    console.error('Error resolving report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createReport,
  getActiveReports,
  getReportsHistory,
  getActiveReportsByTable,
  resolveReport
};
