require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const errorHandler = require('./middleware/errorHandler');
const { authenticate, authorize } = require('./middleware/authMiddleware');

const authController = require('./controllers/authController');
const menuController = require('./controllers/menuController');
const tableController = require('./controllers/tableController');
const orderController = require('./controllers/orderController');
const kotController = require('./controllers/kotController');
const analyticsController = require('./controllers/analyticsController');

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
});
io.of('/kitchen').on('connection', (socket) => {
  socket.join('kitchen:global');
});
io.of('/admin').on('connection', (socket) => {
  socket.join('admin:global');
});

// --- REST API Routes --- //

// Auth
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', authenticate, authController.logout);

// Menu
app.get('/api/menu', menuController.getMenu);
app.get('/api/menu/categories', menuController.getCategories);
app.post('/api/menu', authenticate, authorize('admin'), menuController.createMenuItem);
app.put('/api/menu/:id', authenticate, authorize('admin'), menuController.updateMenuItem);
app.delete('/api/menu/:id', authenticate, authorize('admin'), menuController.deleteMenuItem);
app.patch('/api/menu/:id/availability', authenticate, authorize('admin'), menuController.toggleAvailability);

// Tables
app.get('/api/tables', tableController.getTables);
app.get('/api/tables/:tableId', tableController.getTableById);
app.post('/api/tables', authenticate, authorize('admin'), tableController.createTable);
app.delete('/api/tables/:id', authenticate, authorize('admin'), tableController.deleteTable);

// Orders
app.post('/api/orders', orderController.createOrder);
app.get('/api/orders', authenticate, authorize(['admin', 'manager']), orderController.getOrders);
app.get('/api/orders/:id', orderController.getOrderById);
app.patch('/api/orders/:id/status', authenticate, authorize(['admin', 'manager']), orderController.updateOrderStatus);
app.post('/api/orders/:id/bill', authenticate, authorize(['admin', 'manager']), orderController.generateBill);
app.post('/api/orders/:id/request-bill', orderController.requestBill);

// KOT
app.get('/api/kot', authenticate, kotController.getKot);
app.get('/api/kot/history', authenticate, kotController.getKotHistory);
app.patch('/api/kot/:id/status', authenticate, kotController.updateKotStatus);

// Analytics
app.get('/api/analytics/today', authenticate, authorize('admin'), analyticsController.getTodayAnalytics);
app.get('/api/analytics/revenue', authenticate, authorize('admin'), analyticsController.getRevenue);
app.get('/api/analytics/top-dishes', authenticate, authorize('admin'), analyticsController.getTopDishes);

// --- AI Service Proxy --- //
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
    
    // dynamically import node-fetch if needed, or use native fetch if node >= 18
    const response = await global.fetch(url, options);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI Service unreachable' });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
