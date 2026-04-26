# AI-Based Smart Restaurant Management System - Implementation Tasks

Based on the `DESIGN.md` and `REQUIREMENTS.md` documents, here is the step-by-step task list to implement the restaurant management system.

## Phase 1: Project Initialization & Structure
- [x] Initialize the modular monorepo structure (`client/`, `server/`, `ai-service/`, `shared/`).
- [x] Set up the `shared` directory with common constants (`KOT_STATUS`, `ORDER_STATUS`, `SOCKET_EVENTS`).
- [x] Initialize Node.js backend in `server/` (Express.js, better-sqlite3).
- [x] Initialize React frontend in `client/` (Vite, Tailwind CSS, shadcn/ui, framer-motion, lucide-react).
- [x] Initialize Python Flask microservice in `ai-service/` (Flask, NumPy, Pandas, APScheduler).

## Phase 2: Database Setup (SQLite)
- [x] Configure `better-sqlite3` connection in Node.js and enable `WAL` mode.
- [x] Create database migration: `tables` (id, table_number, qr_code_url, is_occupied).
- [x] Create database migration: `menu_items` (id, name, description, price, category, image_url, is_veg, tags, is_available).
- [x] Create database migration: `orders` and `order_items` tables.
- [x] Create database migration: `kot` (Kitchen Order Tickets) table.
- [x] Create database migration: `admins` (email, password_hash, role).
- [x] Write a seed script to populate initial mock data (tables, menu items, admin user).

## Phase 3: Backend REST API Core (Node.js/Express)
- [x] Set up Express middlewares (cors, body-parser, error handler).
- [x] Implement Auth APIs (`POST /api/auth/login`, `POST /api/auth/logout`) with JWT and bcrypt.
- [x] Implement Menu APIs:
  - [x] `GET /api/menu` and `GET /api/menu/categories`
  - [x] `POST`, `PUT`, `DELETE /api/menu` (Admin)
  - [x] `PATCH /api/menu/:id/availability`
- [x] Implement Table APIs:
  - [x] `GET /api/tables`, `GET /api/tables/:tableId`
  - [x] `POST /api/tables` (Generate Table & `qrcode` integration)
  - [x] `DELETE /api/tables/:id`
- [x] Implement Order APIs:
  - [x] `POST /api/orders` (Order creation and automated KOT logic)
  - [x] `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status`
- [x] Implement KOT APIs:
  - [x] `GET /api/kot`, `GET /api/kot/history`
  - [x] `PATCH /api/kot/:id/status` (Update status and trigger sockets)
- [x] Implement Analytics APIs (`/today`, `/revenue`, `/top-dishes`).
- [x] Set up Express proxy routes to forward `/api/ai/*` requests to the Flask microservice.

## Phase 4: AI Microservice Development (Python/Flask)
- [x] Set up Flask app and establish a read-only SQLite connection.
- [x] Implement the `Recommender` class (Item-based Collaborative Filtering / Co-occurrence Matrix).
- [x] Implement `BackgroundScheduler` to rebuild the matrix every 30 minutes.
- [x] Create API Endpoint: `POST /ai/recommendations` (Top 3 similar items, excluding cart/session).
- [x] Create API Endpoint: `GET /ai/trending` (Top 5 ordered in last 24 hours).
- [x] Create API Endpoint: `GET /ai/frequently-with` (Cart upsell suggestions).
- [x] Implement the `PeakHourPredictor` class (Weighted rolling average with exponential decay).
- [x] Create API Endpoint: `GET /ai/peak-hours` (24-element hourly volume array).

## Phase 5: Real-Time Communication (Socket.IO)
- [x] Initialize Socket.IO server on the Node.js backend.
- [x] Setup distinct namespaces/rooms: `/customer`, `/kitchen`, `/admin`.
- [x] Implement `kot:new` event emission when a new order is placed (to Kitchen & Admin).
- [x] Implement `kot:statusChanged` listener (from Kitchen) and emit `kot:statusUpdate` (to Customer & Admin).
- [x] Implement `menu:updated` broadcast to all active customers when admin toggles item availability.
- [x] Implement Admin peak hour alerts via Socket.IO (emit 30 mins before predicted peak).

## Phase 6: Frontend Architecture & Global State
- [x] Configure React Router v6 for the 3 portals (Customer, Admin, Kitchen KDS).
- [x] Implement Protected Routes for Admin and Kitchen access.
- [x] Setup Zustand stores:
  - [x] `sessionStore` (tableId, tableNumber)
  - [x] `cartStore` (items, quantities, special notes, totals)
  - [x] `orderStore` (current order, KOT status)
  - [x] `authStore` (JWT token, user role)
- [x] Configure Axios instance with base URL and auth interceptors.
- [x] Create custom Socket.IO hooks (`useKOTSocket`, `useOrderStatus`).
- [x] Implement base design tokens and UI components (shadcn/ui, Tailwind config).

## Phase 7: Customer Portal Features
- [x] **Table Auto-Resolution**: Extract `tableId` from URL (`/menu/:tableId`), validate via API, and set in Zustand. Handle invalid QR gracefully.
- [x] **Menu Page**:
  - [x] Display sticky header with resolved Table Number and Cart Icon.
  - [x] Implement category tabs, search bar (debounced), and Veg/Non-Veg filter.
  - [x] Render visually rich menu item cards (Image, tags, Add button).
  - [x] Integrate AI components: "Trending Today" and "Recommended for You".
- [x] **Cart Page**:
  - [x] Display cart items with increment/decrement/remove actions.
  - [x] Implement expandable text input for per-item special notes (e.g., "Jain", "Less Spicy").
  - [x] Display AI-driven "Frequently Ordered Together" upsell chips.
  - [x] Submit order to backend and redirect on success.
- [x] **Live Order Status Page**:
  - [x] Render animated progress stepper (Placed → Sent → Preparing → Ready).
  - [x] Listen to Socket.IO for real-time status updates and reflect changes instantly.

## Phase 8: Kitchen Display System (KDS)
- [x] Build KOT Board UI (Tablet-optimized landscape grid).
- [x] Implement live incoming KOT feed (Socket.IO `kot:new` listener).
- [x] Render KOT Cards:
  - [x] Display items, quantities, and highlighted special notes badges.
  - [x] Implement an elapsed time counter (updating every 60s).
  - [x] Add visual entrance animations (Framer Motion) and Web Audio API chime for new tickets.
- [x] Add actionable status buttons to KOT Cards (Accept, Preparing, Ready) to emit socket events.
- [x] Build the Kitchen KOT History page for completed/served tickets.

## Phase 9: Admin Portal Features
- [x] Build secure Admin Login screen.
- [x] Build Admin Dashboard: KPI cards, Peak Hour chart (from AI service).
- [x] Build Orders Management Page: Table view, status filters, bulk updates.
- [x] Build Menu Management Page: CRUD operations, dietary tags, availability toggle.
- [x] Build Tables Management Page: Table creation, QR code display/download, occupancy grid.
- [x] Build Analytics Page: Recharts for revenue (line), top dishes (bar), category split (donut).
- [x] Build KOT Audit History log.

## Phase 10: Integration, Testing & Polish
- [x] Conduct end-to-end flow testing (Customer QR -> Menu -> Cart -> KOT Generation -> Kitchen Processing -> Customer Status).
- [x] Verify Socket.IO reconnection logic and state hydration for KDS and Customer portals.
- [x] Test fallback mechanisms for AI recommendations (Cold-start scenarios).
- [x] Polish UI: Add skeleton loaders for data fetching, ensure responsive design (375px+ mobile, 768px+ tablet, 1280px+ desktop).
- [x] Review code against security requirements (JWT handling, unscoped data access prevention).
