# Software Design Document (SDD)
## AI-Based Smart Restaurant Management System

**Version:** 2.0  
**Date:** April 2026  
**Architecture Pattern:** Modular Monorepo — SQLite Backend — Flask AI Microservice

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack Rationale](#2-technology-stack-rationale)
3. [Database Design (SQLite)](#3-database-design-sqlite)
4. [Module Design](#4-module-design)
5. [KOT System Design](#5-kot-system-design)
6. [API Design](#6-api-design)
7. [Real-Time Architecture (Socket.IO)](#7-real-time-architecture-socketio)
8. [AI Service Design](#8-ai-service-design)
9. [Frontend Architecture](#9-frontend-architecture)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Security Design](#11-security-design)
12. [Key Design Decisions](#12-key-design-decisions)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║                         CLIENT LAYER                            ║
║                                                                  ║
║  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   ║
║  │   Customer     │  │     Admin      │  │   Kitchen KDS    │   ║
║  │   Portal       │  │    Portal      │  │   (KOT Board)    │   ║
║  │  (Mobile 375+) │  │ (Desktop 1280+)│  │  (Tablet 768+)   │   ║
║  └───────┬────────┘  └───────┬────────┘  └────────┬─────────┘   ║
║          └───────────────────┼─────────────────────┘            ║
║                    React + Vite + Zustand                        ║
╚══════════════════════════════╪═══════════════════════════════════╝
                               │  HTTP REST + Socket.IO (WS)
╔══════════════════════════════╪═══════════════════════════════════╗
║                       SERVER LAYER                               ║
║              ┌──────────────▼──────────────┐                    ║
║              │     Node.js + Express.js     │                    ║
║              │     + Socket.IO Server       │                    ║
║              │     + better-sqlite3         │                    ║
║              └──────┬───────────────┬───────┘                    ║
║                     │               │                            ║
║           ┌─────────▼──┐   ┌────────▼────────┐                  ║
║           │  SQLite DB  │   │   Flask AI      │                  ║
║           │ restaurant  │   │  Microservice   │                  ║
║           │   .db       │   │  (internal REST)│                  ║
║           └─────────────┘   └─────────────────┘                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### 1.2 Monorepo Folder Structure

```
/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── customer/       # MenuPage, CartPage, OrderStatusPage
│   │   │   ├── admin/          # Dashboard, Orders, Menu, Tables, Analytics
│   │   │   └── kitchen/        # KOTBoard, KitchenHistory
│   │   ├── components/
│   │   │   ├── ui/             # Base design system components
│   │   │   ├── customer/       # MenuCard, CartItem, StatusStepper
│   │   │   ├── admin/          # KPICard, RevenueChart, TableGrid
│   │   │   └── kitchen/        # KOTCard, KOTStatusButton, AudioAlert
│   │   ├── store/              # Zustand stores (cart, order, auth, socket)
│   │   ├── hooks/              # useSocket, useKOT, useRecommendations
│   │   ├── api/                # Axios client wrappers per domain
│   │   ├── lib/                # cn() utility, date formatters, etc.
│   │   └── styles/             # Global CSS, design tokens (CSS variables)
│   └── vite.config.js
│
├── server/
│   ├── routes/                 # menu.js, orders.js, kot.js, tables.js, auth.js
│   ├── controllers/            # Business logic per domain
│   ├── db/
│   │   ├── index.js            # better-sqlite3 connection + WAL config
│   │   └── migrations/         # 001_init.sql, 002_add_kot.sql, ...
│   ├── middleware/             # authMiddleware.js, errorHandler.js
│   ├── socket/                 # socket.js — all Socket.IO event handlers
│   ├── services/               # kotService.js, aiService.js, qrService.js
│   └── index.js                # App entry point
│
├── ai-service/
│   ├── app.py                  # Flask entry point, route definitions
│   ├── recommender.py          # Co-occurrence matrix + recommendation logic
│   ├── predictor.py            # Peak hour prediction logic
│   ├── db.py                   # SQLite read connection (read-only, same .db file)
│   └── requirements.txt        # flask, numpy, pandas, scikit-learn
│
└── shared/
    ├── constants.js            # ORDER_STATUS, KOT_STATUS, SOCKET_EVENTS
    └── utils.js                # Shared formatters, validators
```

---

## 2. Technology Stack Rationale

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React.js + Vite | Fastest dev server; hot reload; component reuse across all 3 portals |
| UI Library | Tailwind CSS + shadcn/ui | Utility-first; no custom CSS files; production-ready accessible components |
| State Management | Zustand | Lightweight, zero-boilerplate; perfect for cart, session, and socket state |
| Backend | Node.js + Express.js | JS end-to-end with frontend; fast REST API development; large npm ecosystem |
| Database | SQLite (better-sqlite3) | Zero infrastructure; single `.db` file; full SQL power; WAL for concurrency |
| Real-Time | Socket.IO | Handles reconnection, namespaces, rooms, and WS fallback automatically |
| Auth | JWT + bcrypt | Stateless; no session store needed; secure password hashing |
| QR Codes | qrcode (npm) | Single library; generates PNG/SVG QR per table; no external service |
| AI Logic | Python Flask | Isolated microservice; NumPy/Pandas ecosystem; independent from Node |
| AI Libraries | NumPy + Pandas | Co-occurrence matrix, time-series aggregation; no heavy ML pipeline needed |
| Charts | Recharts (React) | Declarative React charts; responsive; works with Tailwind layout |
| Animations | Framer Motion | Production-grade micro-animations; page transitions; KOT card entrance effects |

---

## 3. Database Design (SQLite)

### 3.1 Schema

```sql
-- Enable WAL mode for concurrent access
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────
CREATE TABLE tables (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  table_number TEXT    NOT NULL UNIQUE,
  qr_code_url  TEXT,
  is_occupied  INTEGER NOT NULL DEFAULT 0,   -- 0 = free, 1 = occupied
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- Menu Items
-- ─────────────────────────────────────────
CREATE TABLE menu_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  description  TEXT,
  price        REAL    NOT NULL,
  category     TEXT    NOT NULL,
  image_url    TEXT,
  is_veg       INTEGER NOT NULL DEFAULT 1,    -- 1 = veg, 0 = non-veg
  tags         TEXT    DEFAULT '[]',           -- JSON array: ["Jain","Vegan","Spicy"]
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────
CREATE TABLE orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id     INTEGER NOT NULL REFERENCES tables(id),
  status       TEXT    NOT NULL DEFAULT 'placed',
    -- placed | preparing | ready | served
  total_amount REAL    NOT NULL DEFAULT 0,
  placed_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE order_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id   INTEGER NOT NULL REFERENCES menu_items(id),
  quantity       INTEGER NOT NULL DEFAULT 1,
  special_notes  TEXT    DEFAULT ''
);

-- ─────────────────────────────────────────
-- Kitchen Order Tickets (KOT)
-- ─────────────────────────────────────────
CREATE TABLE kot (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kot_number   TEXT    NOT NULL,         -- e.g. "KOT-007" — resets daily
  order_id     INTEGER NOT NULL REFERENCES orders(id),
  table_id     INTEGER NOT NULL REFERENCES tables(id),
  status       TEXT    NOT NULL DEFAULT 'received',
    -- received | accepted | preparing | ready | served
  generated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- Admins
-- ─────────────────────────────────────────
CREATE TABLE admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'admin',   -- admin | manager
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### 3.2 Key Indexes

```sql
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_table      ON orders(table_id);
CREATE INDEX idx_orders_placed_at  ON orders(placed_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_kot_status        ON kot(status);
CREATE INDEX idx_kot_order         ON kot(order_id);
CREATE INDEX idx_menu_category     ON menu_items(category, is_available);
```

### 3.3 KOT Number Generation Logic

```javascript
// kotService.js
function generateKotNumber(db) {
  const today = new Date().toISOString().split('T')[0]; // "2026-04-24"
  const todayStart = `${today} 00:00:00`;

  const row = db.prepare(`
    SELECT COUNT(*) as count FROM kot WHERE generated_at >= ?
  `).get(todayStart);

  const seq = String(row.count + 1).padStart(3, '0');
  return `KOT-${seq}`;  // "KOT-001", "KOT-002", ...
}
```

### 3.4 SQLite Connection Setup (Node.js)

```javascript
// db/index.js
const Database = require('better-sqlite3');

const db = new Database('./data/restaurant.db', { verbose: console.log });

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
```

---

## 4. Module Design

### 4.1 Customer Module Flow

```
Customer Scans QR Code → /menu/:tableId
         │
         ▼
React reads :tableId from URL params
→ Validate against GET /api/tables/:tableId
→ Store { tableId, tableNumber } in Zustand sessionStore
→ Display "Table 7" in header throughout session
         │
         ▼
MenuPage renders
├── GET /api/menu → fetch all available items
├── GET /api/ai/recommendations → fetch personalised picks
├── GET /api/ai/trending → fetch trending today
└── Client-side: category tabs, veg filter, search (all in-memory)
         │
         ▼
Customer adds items to cart (Zustand cartStore)
├── Per-item notes via expandable input
└── Upsell chips: GET /api/ai/frequently-with?items=[]
         │
         ▼
CartPage → Review → "Place Order"
→ POST /api/orders { tableId, items[], notes }
→ Backend creates order + order_items in SQLite
→ Backend auto-generates KOT → emits kot:new via Socket.IO
→ Response: { orderId }
         │
         ▼
Redirect to /order-status/:orderId
└── Socket.IO listener: kot:statusUpdate → update Zustand orderStore
```

### 4.2 Zustand Store Design

```javascript
// store/sessionStore.js
{
  tableId: null,
  tableNumber: null,
  setTable: ({ tableId, tableNumber }) => void
}

// store/cartStore.js
{
  items: [{ menuItemId, name, price, quantity, notes, isVeg }],
  addItem: (item) => void,
  removeItem: (menuItemId) => void,
  updateQuantity: (menuItemId, delta) => void,
  updateNotes: (menuItemId, notes) => void,
  clearCart: () => void,
  total: () => number   // derived
}

// store/orderStore.js
{
  currentOrder: null,   // { orderId, kotId, kotNumber, status, items }
  setOrder: (order) => void,
  updateKotStatus: (newStatus) => void
}

// store/authStore.js (Admin + Kitchen)
{
  token: null,
  role: null,
  login: (token, role) => void,
  logout: () => void
}
```

---

## 5. KOT System Design

### 5.1 KOT Lifecycle

```
Order Placed (Customer)
        │
        ▼
Backend: createOrder() → inserts into orders + order_items
        │
        ▼
Backend: kotService.generateKOT(orderId)
  ├── Generates KOT-XXX number
  ├── Inserts into kot table (status: "received")
  └── Updates orders.status = "placed"
        │
        ▼
Socket.IO: emit("kot:new", kotPayload) to /kitchen + /admin rooms
        │
        ▼
KDS: New KOT card appears with entrance animation + audio chime
        │
        ▼
Kitchen Staff Actions:
  ├── "Accept"    → kot.status = "accepted"   → emit kot:statusUpdate
  ├── "Preparing" → kot.status = "preparing"  → emit kot:statusUpdate
  └── "Ready"     → kot.status = "ready"      → emit kot:statusUpdate
        │
        ▼
Customer status screen updates in real time
        │
        ▼
Admin/Waiter:
  └── "Served"   → kot.status = "served"     → KOT archived to history
                → orders.status = "served"   → table freed
```

### 5.2 KOT Card Data Structure

```javascript
// What gets emitted via socket and stored in SQLite
const kotPayload = {
  id: 42,
  kotNumber: "KOT-007",
  orderId: 18,
  tableId: 3,
  tableNumber: "Table 3",
  status: "received",
  generatedAt: "2026-04-24T14:32:00Z",
  elapsedMinutes: 0,
  items: [
    {
      menuItemId: 5,
      name: "Paneer Tikka",
      quantity: 2,
      specialNotes: "Jain, No Onion",
      isVeg: true
    },
    {
      menuItemId: 12,
      name: "Butter Naan",
      quantity: 4,
      specialNotes: "",
      isVeg: true
    }
  ]
}
```

### 5.3 KOT Card Component Design

```
┌─────────────────────────────────────────────────┐
│  KOT-007                    ●  Table 3          │
│  ─────────────────────────────────────────────  │
│  2x  Paneer Tikka                               │
│      ╰─ 🏷 Jain  🏷 No Onion                   │
│  4x  Butter Naan                                │
│  ─────────────────────────────────────────────  │
│  ⏱ 4 min ago            STATUS: Received       │
│                                                  │
│  [ Accept Order ]  [ Preparing ]  [ Ready ✓ ]   │
└─────────────────────────────────────────────────┘
```

- Special notes displayed as coloured badge chips (orange for dietary, blue for spice notes)
- Elapsed time counter updating every 60 seconds (React `setInterval`)
- Status buttons change colour based on current state: inactive = outline, active = filled
- Card border-left accent changes colour by status: grey → yellow → orange → green

---

## 6. API Design

### 6.1 REST Endpoints

#### Menu
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| GET | `/api/menu` | Public | Fetch all available menu items |
| GET | `/api/menu/categories` | Public | Fetch distinct category list |
| POST | `/api/menu` | Admin | Create menu item |
| PUT | `/api/menu/:id` | Admin | Update menu item |
| DELETE | `/api/menu/:id` | Admin | Delete menu item |
| PATCH | `/api/menu/:id/availability` | Admin | Toggle availability → emits `menu:updated` |

#### Tables
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| GET | `/api/tables` | Admin | All tables with occupancy |
| GET | `/api/tables/:tableId` | Public | Validate table ID (QR resolution) |
| POST | `/api/tables` | Admin | Create table + generate QR code |
| DELETE | `/api/tables/:id` | Admin | Remove table |

#### Orders
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/api/orders` | Public | Place order → auto-generates KOT |
| GET | `/api/orders` | Admin | All orders with optional filters |
| GET | `/api/orders/:id` | Public | Fetch order + KOT status (for status page) |
| PATCH | `/api/orders/:id/status` | Admin | Update order status |

#### KOT
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| GET | `/api/kot` | Kitchen / Admin | All active KOTs |
| GET | `/api/kot/history` | Kitchen / Admin | Completed KOTs (filterable by date, table) |
| PATCH | `/api/kot/:id/status` | Kitchen / Admin | Update KOT status → emits `kot:statusUpdate` |

#### Auth
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/api/auth/login` | Public | Login → returns JWT |
| POST | `/api/auth/logout` | Auth | Logout (client-side token clear) |

#### Analytics
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| GET | `/api/analytics/today` | Admin | Today's revenue, order count, avg order value |
| GET | `/api/analytics/revenue` | Admin | Revenue over time (`?range=day/week/month`) |
| GET | `/api/analytics/top-dishes` | Admin | Top N dishes by quantity sold |

#### AI (Internal — Node proxies these from Flask)
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/ai/recommendations` | Body: `{ cartItemIds[], sessionItemIds[] }` → top 3 co-occurring items |
| GET | `/api/ai/trending` | Top 5 most-ordered items in last 24 hours |
| GET | `/api/ai/peak-hours` | 24-element array of predicted hourly order volumes |
| GET | `/api/ai/frequently-with` | Query: `?items=id1,id2` → upsell suggestions for cart |

### 6.2 Standard Response Envelope

```json
{
  "success": true,
  "data": { },
  "message": null
}
```
Error response:
```json
{
  "success": false,
  "data": null,
  "message": "Validation failed: price must be a positive number",
  "code": "VALIDATION_ERROR"
}
```

---

## 7. Real-Time Architecture (Socket.IO)

### 7.1 Namespace & Room Strategy

```
Socket.IO Server
├── Namespace: /customer
│   └── Room: order:{orderId}   ← customer joins on order placement
│
├── Namespace: /kitchen
│   └── Room: kitchen:global    ← all KDS clients join this
│
└── Namespace: /admin
    └── Room: admin:global      ← all admin sessions join this
```

### 7.2 Event Flow

```
[Customer places order]
        │
        ▼
Server: createOrder() → generateKOT()
        │
        ├── io.of('/kitchen').to('kitchen:global').emit('kot:new', kotPayload)
        └── io.of('/admin').to('admin:global').emit('kot:new', kotPayload)

[Kitchen marks KOT "Ready"]
        │
        ▼
KDS Client: socket.emit('kot:statusChanged', { kotId, newStatus: 'ready' })
        │
        ▼
Server: updateKOTStatus() → saves to SQLite
        │
        ├── io.of('/customer').to(`order:${orderId}`).emit('kot:statusUpdate', payload)
        └── io.of('/admin').to('admin:global').emit('kot:statusUpdate', payload)

[Admin toggles menu item availability]
        │
        ▼
Server: updateMenuAvailability()
        └── io.of('/customer').emit('menu:updated', { itemId, isAvailable })
```

### 7.3 Client-Side Socket Hooks

```javascript
// hooks/useKOTSocket.js  (Kitchen / Admin)
function useKOTSocket() {
  const socket = useRef(null);
  const addKOT = useKOTStore(s => s.addKOT);

  useEffect(() => {
    socket.current = io('/kitchen', { auth: { token } });

    socket.current.on('kot:new', (kot) => {
      addKOT(kot);
      playChime();       // Web Audio API
      triggerFlash();    // Framer Motion animation
    });

    return () => socket.current.disconnect();
  }, []);
}

// hooks/useOrderStatus.js  (Customer)
function useOrderStatus(orderId) {
  const socket = useRef(null);
  const updateStatus = useOrderStore(s => s.updateKotStatus);

  useEffect(() => {
    socket.current = io('/customer');
    socket.current.emit('join:order', { orderId });

    socket.current.on('kot:statusUpdate', ({ newStatus }) => {
      updateStatus(newStatus);
    });

    return () => socket.current.disconnect();
  }, [orderId]);
}
```

---

## 8. AI Service Design

### 8.1 Flask Service Architecture

```python
# app.py — Flask entry point
from flask import Flask, request, jsonify
from recommender import Recommender
from predictor import PeakHourPredictor
import db

app = Flask(__name__)
recommender = Recommender(db)   # initialised once, refreshed every 30 min
predictor   = PeakHourPredictor(db)

@app.route('/ai/recommendations', methods=['POST'])
def get_recommendations():
    body = request.json
    cart_ids    = body.get('cartItemIds', [])
    session_ids = body.get('sessionItemIds', [])
    result = recommender.get_similar(cart_ids, exclude=session_ids, top_n=3)
    return jsonify({ "recommendations": result })

@app.route('/ai/trending')
def get_trending():
    result = recommender.trending_today(top_n=5)
    return jsonify({ "trending": result })

@app.route('/ai/peak-hours')
def get_peak_hours():
    result = predictor.predict()
    return jsonify({ "hourlyVolume": result })  # 24-element array

@app.route('/ai/frequently-with')
def frequently_with():
    item_ids = request.args.get('items', '').split(',')
    result = recommender.frequently_ordered_with(item_ids, top_n=3)
    return jsonify({ "suggestions": result })
```

### 8.2 Recommendation Engine (Co-occurrence Matrix)

```python
# recommender.py
import numpy as np
import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler

class Recommender:
    def __init__(self, db):
        self.db = db
        self.matrix = None    # co-occurrence matrix (numpy 2D array)
        self.item_index = {}  # { menuItemId: matrix_index }
        self.build_matrix()
        # Rebuild every 30 minutes
        scheduler = BackgroundScheduler()
        scheduler.add_job(self.build_matrix, 'interval', minutes=30)
        scheduler.start()

    def build_matrix(self):
        """
        1. Fetch all completed orders from SQLite
        2. Group order_items by order_id
        3. For each order, increment matrix[i][j] for every item pair (i,j)
        """
        rows = self.db.execute("""
            SELECT oi.order_id, oi.menu_item_id
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status = 'served'
        """).fetchall()

        df = pd.DataFrame(rows, columns=['order_id', 'item_id'])
        unique_items = sorted(df['item_id'].unique())
        self.item_index = { item: idx for idx, item in enumerate(unique_items) }
        n = len(unique_items)
        matrix = np.zeros((n, n), dtype=int)

        for order_id, group in df.groupby('order_id'):
            items = group['item_id'].tolist()
            for i in range(len(items)):
                for j in range(len(items)):
                    if i != j:
                        xi = self.item_index[items[i]]
                        xj = self.item_index[items[j]]
                        matrix[xi][xj] += 1

        self.matrix = matrix

    def get_similar(self, cart_item_ids, exclude=[], top_n=3):
        if self.matrix is None: return self.fallback(top_n)
        scores = np.zeros(len(self.item_index))
        for item_id in cart_item_ids:
            if item_id in self.item_index:
                idx = self.item_index[item_id]
                scores += self.matrix[idx]
        # Zero out cart items and excluded items
        for item_id in cart_item_ids + exclude:
            if item_id in self.item_index:
                scores[self.item_index[item_id]] = 0
        top_indices = np.argsort(scores)[::-1][:top_n]
        index_to_item = { v: k for k, v in self.item_index.items() }
        return [index_to_item[i] for i in top_indices if scores[i] > 0]

    def trending_today(self, top_n=5):
        rows = self.db.execute("""
            SELECT oi.menu_item_id, SUM(oi.quantity) as total
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.placed_at >= datetime('now', '-24 hours')
            GROUP BY oi.menu_item_id
            ORDER BY total DESC
            LIMIT ?
        """, (top_n,)).fetchall()
        return [row[0] for row in rows]

    def fallback(self, top_n):
        rows = self.db.execute("""
            SELECT menu_item_id, SUM(quantity) as total
            FROM order_items GROUP BY menu_item_id
            ORDER BY total DESC LIMIT ?
        """, (top_n,)).fetchall()
        return [row[0] for row in rows]
```

### 8.3 Peak Hour Prediction

```python
# predictor.py
import numpy as np
import pandas as pd

class PeakHourPredictor:
    def __init__(self, db):
        self.db = db

    def predict(self):
        """
        Returns a 24-element array of predicted order volumes for today,
        one value per hour (index 0 = midnight, 23 = 11pm).
        """
        rows = self.db.execute("""
            SELECT
              strftime('%w', placed_at) as dow,      -- 0=Sunday
              CAST(strftime('%H', placed_at) AS INT) as hour,
              COUNT(*) as order_count,
              -- weeks_ago: 0 = this week, 1 = last week, ...
              CAST(
                (julianday('now') - julianday(placed_at)) / 7
              AS INT) as weeks_ago
            FROM orders
            WHERE placed_at >= datetime('now', '-12 weeks')
            GROUP BY dow, hour, weeks_ago
        """).fetchall()

        df = pd.DataFrame(rows, columns=['dow','hour','count','weeks_ago'])
        today_dow = str(pd.Timestamp.now().dayofweek)  # 0=Monday in pandas

        day_df = df[df['dow'] == today_dow].copy()
        if day_df.empty:
            return [0] * 24

        # Exponential decay weights: w = e^(-0.3 * weeks_ago)
        lambda_ = 0.3
        day_df['weight'] = np.exp(-lambda_ * day_df['weeks_ago'])
        day_df['weighted_count'] = day_df['count'] * day_df['weight']

        result = day_df.groupby('hour').apply(
            lambda g: g['weighted_count'].sum() / g['weight'].sum()
        ).reindex(range(24), fill_value=0)

        return result.round(2).tolist()
```

---

## 9. Frontend Architecture

### 9.1 Routing

```javascript
// App.jsx — React Router v6
<Routes>
  {/* Customer Portal */}
  <Route path="/menu/:tableId"         element={<MenuPage />} />
  <Route path="/cart"                  element={<CartPage />} />
  <Route path="/order-status/:orderId" element={<OrderStatusPage />} />
  <Route path="/recommendations"       element={<RecommendationsPage />} />

  {/* Admin Portal */}
  <Route path="/admin/login"           element={<AdminLogin />} />
  <Route path="/admin"                 element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
    <Route path="dashboard"            element={<DashboardPage />} />
    <Route path="orders"               element={<OrdersPage />} />
    <Route path="menu"                 element={<MenuManagementPage />} />
    <Route path="tables"               element={<TablesPage />} />
    <Route path="analytics"            element={<AnalyticsPage />} />
    <Route path="kot-history"          element={<KOTHistoryPage />} />
  </Route>

  {/* Kitchen KDS */}
  <Route path="/kitchen"               element={<ProtectedRoute role="kitchen"><KOTBoard /></ProtectedRoute>} />
  <Route path="/kitchen/history"       element={<ProtectedRoute role="kitchen"><KitchenHistory /></ProtectedRoute>} />
</Routes>
```

### 9.2 Customer Portal Component Tree

```
MenuPage
├── PageHeader ("Table 7" badge + cart icon with item count)
├── HeroSearchBar (sticky on scroll)
├── CategoryTabsRow (horizontal scroll)
├── VegNonVegToggle
├── RecommendationBanner
│   ├── TrendingStrip (horizontal scroll chips)
│   └── ForYouSection (3 cards)
├── MenuGrid
│   └── MenuCard × n
│       ├── DishImage (with veg/non-veg dot badge)
│       ├── DishName + Price
│       └── AddToCartButton (animates to cart icon on add)
└── FloatingCartBar (fixed bottom — shows total + "View Cart" CTA)
```

### 9.3 KOT Board Component Tree

```
KOTBoard
├── TopBar (KDS header, shift timer, filter controls)
├── KOTGrid (CSS Grid: 2 cols on tablet, 3 cols on larger screens)
│   └── KOTCard × n
│       ├── KOTHeader (KOT number + table badge + elapsed time)
│       ├── ItemList
│       │   └── ItemRow × n (quantity + name + notes badges)
│       ├── StatusBar (colour-coded border + status label)
│       └── ActionButtons (contextual based on current status)
└── AudioAlertManager (hidden, plays chime on kot:new)
```

---

## 10. UI/UX Design System

### 10.1 Design Tokens (CSS Variables)

```css
:root {
  /* Brand Colours */
  --color-primary:       #F97316;   /* Warm orange — food brand */
  --color-primary-light: #FED7AA;
  --color-primary-dark:  #C2410C;

  /* Neutrals */
  --color-gray-50:  #FAFAFA;
  --color-gray-100: #F4F4F5;
  --color-gray-200: #E4E4E7;
  --color-gray-500: #71717A;
  --color-gray-800: #27272A;
  --color-gray-900: #18181B;

  /* Semantic */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error:   #EF4444;
  --color-info:    #3B82F6;

  /* KOT Status Colours */
  --kot-received:  #94A3B8;   /* Slate */
  --kot-accepted:  #FBBF24;   /* Amber */
  --kot-preparing: #F97316;   /* Orange */
  --kot-ready:     #22C55E;   /* Green */
  --kot-served:    #6366F1;   /* Indigo */

  /* Surface (Light Mode) */
  --surface-bg:      #FFFFFF;
  --surface-card:    #F9FAFB;
  --surface-overlay: rgba(255,255,255,0.8);

  /* Typography */
  --font-display: 'Playfair Display', serif;   /* Menu headings, KOT numbers */
  --font-body:    'Inter', sans-serif;          /* All UI text */

  /* Radius */
  --radius-sm:  6px;
  --radius-md:  12px;
  --radius-lg:  20px;
  --radius-xl:  28px;

  /* Shadow */
  --shadow-card:  0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06);
  --shadow-float: 0 8px 32px rgba(0,0,0,0.14);
}

/* Dark Mode */
[data-theme="dark"] {
  --surface-bg:   #09090B;
  --surface-card: #18181B;
  --color-gray-800: #E4E4E7;
}
```

### 10.2 Component Design Patterns

**Menu Card (Customer)**
- Rounded card (`border-radius: var(--radius-lg)`) with subtle drop shadow
- Full-width dish image (16:9 aspect ratio, object-cover)
- Veg/Non-Veg indicator: green dot (veg) or red dot (non-veg) overlaid on image corner
- Price in bold primary colour
- "Add" button: pill shape, animates to show quantity stepper after first tap
- Unavailable state: image desaturated, overlay badge "Currently Unavailable"

**KOT Card (Kitchen)**
- Left border (4px) changes colour by KOT status using CSS variable `--kot-{status}`
- Glassmorphism surface: `backdrop-filter: blur(8px)` on dark kitchen background
- Special notes as coloured badge chips (dietary = amber, spice = red, custom = blue)
- Action buttons: full-width at bottom of card, contextual — shows only the next valid transition

**Floating Cart Bar (Customer)**
- Fixed to viewport bottom on mobile
- Shows: item count badge + order total + "View Cart →" CTA
- Uses `--shadow-float` for lift effect above page content
- Entrance animation: slides up from bottom when first item added to cart

**Status Stepper (Customer Order Tracking)**
- Horizontal stepper on mobile (4 steps)
- Active step: filled circle with primary colour + pulsing ring animation
- Completed steps: filled with success green + checkmark
- Step labels: "Order Placed", "KOT Sent", "Preparing", "Ready 🎉"

### 10.3 Responsive Breakpoints

| Breakpoint | Min Width | Target |
|-----------|----------|--------|
| `xs` | 375px | Mobile (Customer Portal default) |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablet (KDS default) |
| `lg` | 1024px | Small desktop |
| `xl` | 1280px | Desktop (Admin default) |

### 10.4 Animation Guidelines (Framer Motion)

| Interaction | Animation |
|-------------|-----------|
| New KOT arrival | Slide down + fade in from top of KOT grid |
| KOT status change | Card border colour transition (300ms ease) |
| Add to cart | Item count badge scale pop (spring) |
| Page transitions | Fade + slight translateY (200ms) |
| Order status update | Step fills in with green + scale up (spring) |
| Skeleton → content | Fade in (150ms) |

---

## 11. Security Design

### 11.1 Auth Flow

```
Admin Login:
  POST /api/auth/login { email, password }
  ├── Fetch admin by email from SQLite
  ├── bcrypt.compare(password, passwordHash)
  ├── On success: sign JWT({ id, role }, SECRET, { expiresIn: '8h' })
  └── Return { token, role }

Client stores token in memory (authStore) + localStorage for persistence.

Protected API request:
  Header: Authorization: Bearer <token>
  → authMiddleware: jwt.verify(token, SECRET)
  → Valid: attach req.admin → next()
  → Invalid/expired: return 401 { code: "UNAUTHORIZED" }
```

### 11.2 Customer Route Scoping
- `POST /api/orders` — public; accepts tableId from URL param (validated against SQLite)
- `GET /api/orders/:id` — public but scoped: returns only status fields, no financial or cross-table data
- `GET /api/menu` — fully public
- All `/api/admin/*` and `/api/kot/*` routes require valid JWT

### 11.3 Environment Configuration

```
# server/.env
PORT=3001
JWT_SECRET=your_super_secret_key_here
AI_SERVICE_URL=http://localhost:5001
DB_PATH=./data/restaurant.db

# ai-service/.env
PORT=5001
DB_PATH=../server/data/restaurant.db
```

---

## 12. Key Design Decisions

### 12.1 SQLite over MongoDB or PostgreSQL
SQLite requires zero infrastructure — no separate DB process, no Docker dependency for the database, and no connection string management. `better-sqlite3` provides synchronous APIs ideal for Node.js without callback or async complexity. WAL mode enables concurrent reads, and the single `.db` file is trivially backed up or reset for demos. For a college project with a single-location restaurant model, SQLite's scale is entirely adequate.

### 12.2 QR Auto-Resolution (No Manual Table Entry)
Embedding the table identifier directly in the QR URL (`/menu/:tableId`) eliminates a friction point in the customer journey. Since each table has a physically distinct QR code, the table identity is guaranteed by which QR was scanned. Manual entry introduces the risk of customers entering the wrong table number; URL-based resolution is deterministic and requires no user cognition.

### 12.3 Dedicated KOT Entity (Not Just Order Status)
A separate `kot` table decouples the kitchen workflow from the customer order model. This enables: (1) independent KOT numbering that resets daily per restaurant convention; (2) a KOT lifecycle (`received → accepted → preparing → ready → served`) that is more granular than a simple order status; (3) future support for splitting one order into multiple KOTs (e.g., starter and main course to kitchen at different times). KOTs are the restaurant industry's standard and naming them correctly makes the project more credible in a viva context.

### 12.4 Python Microservice for AI (Not Node.js)
NumPy co-occurrence matrix operations and Pandas time-series aggregation are dramatically simpler and more performant in Python than equivalent JavaScript libraries. Keeping AI isolated in a Flask microservice also means the Node.js server stays focused on REST/WebSocket orchestration. Future upgrades to full scikit-learn models require no changes to the Node codebase.

### 12.5 Zustand over Redux
Zustand achieves cart, session, order, and auth state management in ~40 total lines across four stores. Redux would require four times the boilerplate for no functional gain at this project scale. Zustand's `devtools` middleware provides the same Redux DevTools debugging experience.

### 12.6 Framer Motion for Animations
Kitchen staff need to instantly notice a new KOT arriving. A plain DOM update is insufficient — the new card must animate in with enough visual salience to catch peripheral vision. Framer Motion's `AnimatePresence` and `layout` props handle KOT card entrance, reordering, and exit animations declaratively with a single `motion.div` wrapper around each KOT card, keeping animation logic out of business logic.

---

*End of Design Document — v2.0*
