require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

let activeHelpRequests = [];

const errorHandler = require('./middleware/errorHandler');
const { authenticate, authorize } = require('./middleware/authMiddleware');

const authController = require('./controllers/authController');
const menuController = require('./controllers/menuController');
const tableController = require('./controllers/tableController');
const orderController = require('./controllers/orderController');
const kotController = require('./controllers/kotController');
const analyticsController = require('./controllers/analyticsController');
const waiterController = require('./controllers/waiterController');
const variantController = require('./controllers/variantController');
const reportController = require('./controllers/reportController');
const staffController = require('./controllers/staffController');

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend and API
app.use(cors());
app.use(express.json());

// Set up Socket.IO
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] }
});

// Pass IO instance to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket namespaces
io.of('/customer').on('connection', (socket) => {
  socket.on('join:order', ({ orderId }) => {
    socket.join(`order:${orderId}`);
  });
  socket.on('join:table', ({ tableId }) => {
    socket.join(`table:${tableId}`);
  });
  socket.on('help:request', ({ tableId }) => {
    try {
      const parsedTableId = parseInt(tableId);
      if (!activeHelpRequests.some(r => r.id === parsedTableId)) {
        const table = db.prepare('SELECT table_number FROM tables WHERE id = ?').get(parsedTableId);
        const tableNumber = table ? table.table_number : `Table ${tableId}`;
        activeHelpRequests.push({
          id: parsedTableId,
          tableId: parsedTableId,
          tableNumber,
          timestamp: new Date().toISOString()
        });
        io.of('/admin').to('admin:global').emit('help:list', activeHelpRequests);
      }
    } catch (e) {
      console.error('Socket help:request error:', e);
    }
  });
});
io.of('/kitchen').on('connection', (socket) => {
  socket.join('kitchen:global');
});
io.of('/admin').on('connection', (socket) => {
  socket.join('admin:global');
  socket.emit('help:list', activeHelpRequests);
  
  socket.on('help:resolve', ({ tableId }) => {
    try {
      const parsedTableId = parseInt(tableId);
      activeHelpRequests = activeHelpRequests.filter(r => r.id !== parsedTableId);
      io.of('/admin').to('admin:global').emit('help:list', activeHelpRequests);
    } catch (e) {
      console.error('Socket help:resolve error:', e);
    }
  });
});
io.of('/waiter').on('connection', (socket) => {
  socket.join('waiter:global');
});

// --- REST API Routes --- //

// Auth
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', authenticate, authController.logout);

// Menu
app.get('/api/menu', variantController.getMenuWithVariants);
app.get('/api/menu/categories', menuController.getCategories);
app.post('/api/menu/categories/order', authenticate, authorize('admin'), menuController.updateCategoryOrder);
app.post('/api/menu/bulk', authenticate, authorize('admin'), menuController.bulkImportMenu);
app.post('/api/menu', authenticate, authorize('admin'), menuController.createMenuItem);
app.put('/api/menu/:id', authenticate, authorize('admin'), menuController.updateMenuItem);
app.delete('/api/menu/:id', authenticate, authorize('admin'), menuController.deleteMenuItem);
app.patch('/api/menu/:id/availability', authenticate, authorize('admin'), menuController.toggleAvailability);

// Menu Variants
app.get('/api/menu/:id/variants', variantController.getVariants);
app.post('/api/menu/:id/variants', authenticate, authorize('admin'), variantController.createVariant);
app.put('/api/menu/:id/variants/:variantId', authenticate, authorize('admin'), variantController.updateVariant);
app.delete('/api/menu/:id/variants/:variantId', authenticate, authorize('admin'), variantController.deleteVariant);

// Table Groups
app.get('/api/table-groups', tableController.getTableGroups);
app.post('/api/table-groups', authenticate, authorize('admin'), tableController.createTableGroup);
app.delete('/api/table-groups/:id', authenticate, authorize('admin'), tableController.deleteTableGroup);

// Tables — ORDER MATTERS: specific paths before :param paths
app.post('/api/tables/merge', authenticate, tableController.mergeTables);
app.get('/api/tables', tableController.getTables);
app.post('/api/tables', authenticate, authorize('admin'), tableController.createTable);
app.get('/api/tables/:tableId', tableController.getTableById);
app.delete('/api/tables/:id', authenticate, authorize('admin'), tableController.deleteTable);
app.patch('/api/tables/:id/status', authenticate, tableController.updateTableStatus);
app.post('/api/tables/:id/unmerge', authenticate, tableController.unmergeTables);

// Orders
app.post('/api/orders', orderController.createOrder);
app.get('/api/orders/sessions', authenticate, authorize(['admin', 'manager']), orderController.getSessions);
app.get('/api/orders', authenticate, authorize(['admin', 'manager']), orderController.getOrders);
app.get('/api/orders/:id', orderController.getOrderById);
app.patch('/api/orders/:id/status', authenticate, authorize(['admin', 'manager']), orderController.updateOrderStatus);
app.post('/api/orders/:id/bill', authenticate, authorize(['admin', 'manager']), orderController.generateBill);
app.post('/api/orders/:id/bill-single', authenticate, authorize(['admin', 'manager']), orderController.billSingleOrder);
app.post('/api/orders/:id/request-bill', orderController.requestBill);
app.post('/api/orders/:id/add-items', authenticate, orderController.addItemsToOrder);
app.delete('/api/orders/history/clear', authenticate, authorize('admin'), orderController.clearOrderHistory);

// Order Item Cancellation
app.patch('/api/order-items/:id/cancel', authenticate, orderController.cancelOrderItem);

// Cancellation Log
app.get('/api/cancellations', authenticate, authorize(['admin', 'manager']), orderController.getCancellationLog);

// KOT
app.get('/api/kot', authenticate, kotController.getKot);
app.get('/api/kot/history', authenticate, kotController.getKotHistory);
app.patch('/api/kot/:id/status', authenticate, kotController.updateKotStatus);
app.delete('/api/kot/history/clear', authenticate, authorize('admin'), orderController.clearKotHistory);

// Analytics
app.get('/api/analytics/comprehensive', authenticate, authorize('admin'), analyticsController.getComprehensiveAnalytics);
app.get('/api/analytics/top-dishes', authenticate, authorize('admin'), analyticsController.getTopDishes);

// Waiters (Admin CRUD)
app.post('/api/auth/waiter-login', waiterController.waiterLogin);
app.get('/api/waiters', authenticate, authorize('admin'), waiterController.getWaiters);
app.post('/api/waiters', authenticate, authorize('admin'), waiterController.createWaiter);
app.put('/api/waiters/:id', authenticate, authorize('admin'), waiterController.updateWaiter);
app.delete('/api/waiters/:id', authenticate, authorize('admin'), waiterController.deleteWaiter);

// Billing — get all unbilled orders for a table
app.get('/api/billing/pending', authenticate, authorize(['admin', 'manager']), orderController.getPendingBills);
app.get('/api/billing/:tableId', orderController.getBillingForTable);
app.post('/api/billing/:tableId/generate', authenticate, authorize(['admin', 'manager']), orderController.generateTableBill);
app.post('/api/billing/:tableId/request', orderController.requestBillByTable);

// Customer Reports
app.post('/api/reports', reportController.createReport);
app.get('/api/reports/active', authenticate, authorize(['admin', 'manager']), reportController.getActiveReports);
app.get('/api/reports/history', authenticate, authorize(['admin', 'manager']), reportController.getReportsHistory);
app.get('/api/reports/table/:tableId', authenticate, authorize(['admin', 'manager']), reportController.getActiveReportsByTable);
app.patch('/api/reports/:id/resolve', authenticate, authorize(['admin', 'manager']), reportController.resolveReport);

// Staff Roster & Attendance & Overtime
app.get('/api/staff/attendance/daily', authenticate, authorize(['admin', 'manager']), staffController.getDailyAttendance);
app.post('/api/staff/attendance/daily', authenticate, authorize(['admin', 'manager']), staffController.markAttendance);
app.get('/api/staff/overtime', authenticate, authorize(['admin', 'manager']), staffController.getOvertimeRecords);
app.post('/api/staff/overtime', authenticate, authorize(['admin', 'manager']), staffController.addOvertime);
app.delete('/api/staff/overtime/:id', authenticate, authorize(['admin', 'manager']), staffController.deleteOvertime);
app.get('/api/staff/roster/summary', authenticate, authorize(['admin', 'manager']), staffController.getMonthRosterSummary);
app.get('/api/staff', authenticate, authorize(['admin', 'manager']), staffController.getAllStaff);
app.post('/api/staff', authenticate, authorize(['admin', 'manager']), staffController.createStaff);
app.get('/api/staff/:id', authenticate, authorize(['admin', 'manager']), staffController.getStaffById);
app.put('/api/staff/:id', authenticate, authorize(['admin', 'manager']), staffController.updateStaff);
app.delete('/api/staff/:id', authenticate, authorize(['admin', 'manager']), staffController.deleteStaff);

// --- AI Service Proxy with Resilient Fallbacks --- //
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';

app.use('/api/ai', async (req, res) => {
  try {
    const url = `${AI_URL}${req.originalUrl.replace('/api/ai', '/ai')}`;
    const options = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.body = JSON.stringify(req.body);
    }
    
    const response = await global.fetch(url, options);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    // Graceful fallback for offline AI service so ordering & menu NEVER fail
    if (req.path.includes('trending')) {
      return res.json({ success: true, trending: [] });
    }
    if (req.path.includes('recommendations')) {
      return res.json({ success: true, recommendations: [] });
    }
    if (req.path.includes('frequently-with')) {
      return res.json({ success: true, suggestions: [] });
    }
    if (req.path.includes('peak-hours')) {
      return res.json({ success: true, hourlyVolume: new Array(24).fill(0) });
    }
    res.status(200).json({ success: false, message: 'AI Service offline', data: [] });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
