# Software Requirements Specification (SRS)
## AI-Based Smart Restaurant Management System

**Version:** 2.0  
**Date:** April 2026  
**Project Type:** Full-Stack Web Application with AI/ML Integration  
**Domain:** Restaurant Tech / Food-Service Digitization

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [AI/ML Requirements](#5-aiml-requirements)
6. [Interface Requirements](#6-interface-requirements)
7. [Data Requirements](#7-data-requirements)
8. [Constraints & Assumptions](#8-constraints--assumptions)
9. [Glossary](#9-glossary)

---

## 1. Introduction

### 1.1 Purpose
This document defines the complete software requirements for the AI-Based Smart Restaurant Management System — a full-stack web application that digitizes restaurant operations from QR-code-triggered ordering to real-time Kitchen Order Ticket (KOT) management and admin analytics. This version reflects a SQLite-backed, mobile-first, QR-auto-resolved architecture.

### 1.2 Scope
The system covers three user-facing portals:
- **Customer Portal** — QR-triggered menu browsing, cart, ordering, and live KOT tracking. Table identity is resolved automatically from the QR URL; no manual input is required from the customer.
- **Admin Portal** — Order and KOT management, menu/table CRUD, revenue analytics, and AI-driven insights.
- **Kitchen Display System (KDS)** — Real-time Kitchen Order Ticket (KOT) feed for kitchen staff, enabling instant acknowledgement and status updates pushed back to customers in real time.

### 1.3 Intended Audience
- Development team (frontend, backend, AI service)
- College project evaluators / viva panel
- Restaurant stakeholders

### 1.4 Definitions & Acronyms

| Term | Definition |
|------|-----------|
| KOT | Kitchen Order Ticket — a uniquely numbered digital slip representing a table's order, transmitted to the kitchen |
| KDS | Kitchen Display System — the digital screen in the kitchen displaying live KOTs |
| QR | Quick Response code — unique per table; encodes menu URL + table ID |
| JWT | JSON Web Token — stateless authentication mechanism |
| KPI | Key Performance Indicator |
| CRUD | Create, Read, Update, Delete |
| Co-occurrence Matrix | Matrix counting how often item pairs appear together in the same order |
| SQLite | Self-contained, serverless, file-based SQL database engine |
| WAL | Write-Ahead Logging — SQLite mode for concurrent read/write access |

---

## 2. Overall Description

### 2.1 Product Perspective
A modular monorepo web application with three independently rendered portals sharing a single Node.js + Express backend and a Python Flask AI microservice. The database is SQLite — a serverless, file-based relational engine with zero infrastructure setup overhead.

```
/client         → React (Vite) — Customer, Admin, Kitchen views
/server         → Node.js + Express.js + Socket.IO + SQLite (better-sqlite3)
/ai-service     → Python Flask microservice (NumPy + Pandas)
/shared         → Constants, socket event names, utility functions
```

### 2.2 User Classes

| User Class | Access Level | Entry Point |
|------------|-------------|-------------|
| Customer | Public (QR-gated) | Scans table QR → table auto-resolved, no account needed |
| Admin | Authenticated | `/admin/login` — JWT-protected all admin routes |
| Kitchen Staff | Authenticated (limited) | `/kitchen` — JWT-protected, view + status update only |

### 2.3 Operating Environment
- **Platform:** Web — Mobile-first responsive design
- **Customer Portal:** Optimised for 375px+ (smartphone)
- **KDS:** Optimised for tablet landscape (768px+)
- **Admin Portal:** Optimised for desktop (1280px+) with tablet fallback
- **Browser Support:** Chrome 90+, Safari 14+, Firefox 88+
- **Database:** SQLite (file-based, no separate DB server required)
- **IDE:** Windsurf (AI-powered)
- **Design Language:** Modern, rich UI — glassmorphism card accents, smooth micro-animations, premium typography, consistent design tokens with light and dark mode support

---

## 3. Functional Requirements

### 3.1 Customer Module

#### 3.1.1 QR Code Entry & Table Auto-Resolution
- **REQ-C-01:** Each table shall have a unique QR code encoding a URL in the format `/menu/:tableId` where `tableId` is the table's unique identifier.
- **REQ-C-02:** When a customer opens the QR URL, the system shall automatically extract the table identifier from the URL parameter and store it in the React session (Zustand store). No manual table number entry shall be required from the customer at any point.
- **REQ-C-03:** The resolved table label (e.g., "Table 7") shall be displayed persistently in the Customer Portal header throughout the session.
- **REQ-C-04:** If the URL contains an invalid or unrecognised table ID, the system shall display a friendly error screen with a "Please rescan the QR code at your table" message.

#### 3.1.2 Menu Browsing
- **REQ-C-05:** The system shall display the full menu in a visually rich card grid, grouped by category with horizontally scrollable category tab navigation.
- **REQ-C-06:** A prominent Veg / Non-Veg toggle filter shall be available at the top of the menu page.
- **REQ-C-07:** Each menu item card shall display: name, image (with fallback placeholder), price, Veg/Non-Veg badge, and an Add to Cart button.
- **REQ-C-08:** A search bar shall allow real-time client-side filtering of items by name or keyword (debounced, 300ms).
- **REQ-C-09:** Items marked unavailable by the admin shall be visually greyed out with an "Unavailable" overlay badge, and the Add to Cart action shall be disabled.

#### 3.1.3 Cart & Ordering
- **REQ-C-10:** The system shall maintain a session cart (Zustand store) supporting quantity increment/decrement and item removal.
- **REQ-C-11:** Per-item special instruction notes (Less Spicy, Jain, Vegan, No Onion, etc.) shall be enterable via an expandable text input on each cart item row.
- **REQ-C-12:** The cart page shall display a full order summary: itemised list, subtotal, and grand total.
- **REQ-C-13:** On tapping "Place Order", the system shall POST the cart contents (with the auto-resolved table ID) to `POST /api/orders`.
- **REQ-C-14:** Immediately upon successful order creation, the backend shall auto-generate a Kitchen Order Ticket (KOT) and broadcast it to the KDS and Admin portal via Socket.IO (`kot:new` event).

#### 3.1.4 Live Order Tracking
- **REQ-C-15:** After placing an order, the customer shall be navigated to a live status screen for their order.
- **REQ-C-16:** The status screen shall display an animated progress bar / stepper with four states: **Order Placed → KOT Sent to Kitchen → Preparing → Ready to Serve**.
- **REQ-C-17:** All KOT status transitions made by kitchen staff shall be pushed to the customer's browser in real time via Socket.IO without page refresh.
- **REQ-C-18:** The customer shall see their full order summary (items, notes, table, total) alongside the live status.

#### 3.1.5 AI Recommendations (Customer-Facing)
- **REQ-C-19:** A "Recommended for You" section shall appear on the menu page driven by item-based collaborative filtering.
- **REQ-C-20:** A "Trending Today" strip shall display the top 5 most-ordered dishes in the last 24 hours.
- **REQ-C-21:** At the cart stage, "Frequently Ordered Together" upsell chips shall appear based on items currently in the cart.
- **REQ-C-22:** Items already in the cart or placed in the current session shall be excluded from all recommendation outputs.

---

### 3.2 Admin Module

#### 3.2.1 Authentication
- **REQ-A-01:** All admin routes shall be protected by a login screen (email + password).
- **REQ-A-02:** Authentication shall use JWT signed tokens; passwords stored as bcrypt hashes (cost factor ≥ 10).
- **REQ-A-03:** JWT tokens shall expire after 8 hours; expired sessions shall redirect to the login screen.

#### 3.2.2 Order & KOT Management
- **REQ-A-04:** The Admin orders page shall display all live and recent orders with filters by status (Placed / Preparing / Ready / Served) and by table number.
- **REQ-A-05:** The admin shall be able to update individual or bulk order statuses.
- **REQ-A-06:** New orders and KOT updates shall appear on the admin dashboard in real time via Socket.IO.
- **REQ-A-07:** The admin shall be able to view a full KOT audit log (REQ-A-13) filterable by date range, table, and status.
- **REQ-A-08:** Each KOT log entry shall display: KOT number, table, items with quantities, timestamp, and final resolved status.

#### 3.2.3 Menu Management
- **REQ-A-09:** The admin shall be able to create, edit, and delete menu items via a rich modal/drawer form interface.
- **REQ-A-10:** Each menu item shall support: name, description, price, category, image upload, veg/non-veg flag, dietary tags (Jain, Vegan, Spicy), and an availability toggle.
- **REQ-A-11:** Toggling item availability shall immediately propagate to all active Customer Portal sessions via a `menu:updated` Socket.IO event.

#### 3.2.4 Table Management
- **REQ-A-12:** The admin shall be able to add, rename, and delete tables.
- **REQ-A-13:** On creating or viewing a table, the system shall generate and display a downloadable/printable QR code encoding that table's unique menu URL.
- **REQ-A-14:** The admin shall be able to view a real-time table occupancy grid showing which tables have active unfulfilled orders.

#### 3.2.5 Revenue Dashboard & Analytics
- **REQ-A-15:** The admin dashboard shall show KPI cards: Today's Revenue, Total Orders Today, Average Order Value, and Predicted Next Peak Hour.
- **REQ-A-16:** The analytics page shall render a revenue line chart with daily / weekly / monthly range toggle.
- **REQ-A-17:** The analytics page shall render a top-selling dishes bar chart and a category-wise revenue donut chart.
- **REQ-A-18:** The analytics page shall render a 24-hour predicted peak hour bar chart sourced from the Flask AI service.
- **REQ-A-19:** The admin shall receive an in-app alert notification 30 minutes before a predicted peak window begins.

---

### 3.3 Kitchen Module — KOT System

#### 3.3.1 KOT Generation (Automated)
- **REQ-K-01:** Every time a customer successfully places an order, the backend shall automatically generate a Kitchen Order Ticket (KOT) with: KOT Number (sequential, resets at midnight), Table Number, list of items with quantities and special notes, timestamp, and initial status "Received".
- **REQ-K-02:** KOT numbers shall follow the format `KOT-001`, `KOT-002`, etc., resetting daily to align with standard restaurant practice.
- **REQ-K-03:** Each KOT shall be persisted in the `kot` table in SQLite with a unique ID and linked to its parent order.

#### 3.3.2 Real-Time KOT Display on KDS
- **REQ-K-04:** The KDS page shall display all active KOTs as styled ticket cards in a live feed, sorted oldest-first (FIFO).
- **REQ-K-05:** New KOTs shall appear on the KDS instantly via Socket.IO (`kot:new`) without any page refresh.
- **REQ-K-06:** Each KOT card shall show: KOT number, Table number, ordered items with quantities, special notes (visually highlighted/badged), elapsed time since KOT was received, and current status.
- **REQ-K-07:** Incoming KOTs shall trigger an audio chime (Web Audio API) and a visual flash/highlight animation on the KDS.

#### 3.3.3 KOT Status Management
- **REQ-K-08:** Kitchen staff shall update KOT status via clearly labelled action buttons on each card: **Accept → Preparing → Ready**.
- **REQ-K-09:** Each status change shall immediately emit a `kot:statusUpdate` Socket.IO event that updates the Customer's order status screen and the Admin dashboard in real time.
- **REQ-K-10:** KOTs marked "Served" (by admin or waiter) shall be removed from the active KDS feed and moved to history.

#### 3.3.4 KOT Filtering & History
- **REQ-K-11:** The KDS shall support filter controls for active KOTs by status and by elapsed time.
- **REQ-K-12:** A `/kitchen/history` view shall show all completed KOTs for the current shift, searchable by KOT number or table number.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **REQ-NF-01:** WebSocket KOT propagation (order placed → KDS display) shall complete within 500ms under normal load.
- **REQ-NF-02:** Customer menu page shall render within 2 seconds on a 4G mobile connection.
- **REQ-NF-03:** SQLite queries for menu fetch, order placement, and KOT retrieval shall complete within 100ms for up to 10,000 records.
- **REQ-NF-04:** AI recommendation Flask API response shall complete within 1 second.

### 4.2 Design & User Experience
- **REQ-NF-05:** The Customer Portal shall be fully usable on mobile screens from 375px width with no horizontal overflow. All tap targets shall be a minimum of 44×44px.
- **REQ-NF-06:** The KDS shall be optimised for tablet landscape (768px+) with large, scannable KOT cards readable at arm's length.
- **REQ-NF-07:** The Admin Portal shall be optimised for desktop (1280px+).
- **REQ-NF-08:** The UI design shall be modern and visually rich: glassmorphism or elevated card components, smooth CSS transitions (≤300ms), micro-animations on cart add/update, and a consistent design token system.
- **REQ-NF-09:** The application shall support light mode and dark mode, with system preference auto-detection.
- **REQ-NF-10:** All data-loading states shall use skeleton screens matching the content layout, not generic spinners.
- **REQ-NF-11:** Typography shall use a premium pairing — a display/serif font for headings and a clean modern sans-serif for body text.
- **REQ-NF-12:** Colour system shall have a defined primary brand colour, neutral scale, semantic colours (success/warning/error), and surface tokens for cards and backgrounds.

### 4.3 Security
- **REQ-NF-13:** Admin and Kitchen routes shall require JWT authentication; unauthenticated requests shall return HTTP 401.
- **REQ-NF-14:** Customer routes shall be scoped: customers can only access their own order data, not other tables' orders.
- **REQ-NF-15:** Passwords shall be hashed with bcrypt before storage; plain text shall never appear in logs or responses.

### 4.4 Reliability
- **REQ-NF-16:** SQLite shall run in WAL mode to support concurrent readers during write operations.
- **REQ-NF-17:** Socket.IO client shall auto-reconnect on disconnect; the KDS and Customer status screen shall rehydrate latest state on reconnection.
- **REQ-NF-18:** The Flask AI service shall return a graceful fallback (popularity-sorted items) when order history is below the cold-start threshold.

### 4.5 Maintainability
- **REQ-NF-19:** The SQLite schema shall be managed via versioned migration scripts under `/server/migrations/`.
- **REQ-NF-20:** All REST endpoints shall be documented in the project README or a `/docs` folder.
- **REQ-NF-21:** Environment-specific configuration (ports, secret keys, DB path, AI service URL) shall be managed via `.env` files.

---

## 5. AI/ML Requirements

### 5.1 Food Recommendation System

| ID | Requirement |
|----|-------------|
| REQ-AI-01 | The system shall implement item-based collaborative filtering using a co-occurrence matrix built from completed SQLite order data. |
| REQ-AI-02 | When a customer adds item X to cart, the system shall return the top 3 most co-occurring items with X. |
| REQ-AI-03 | "Trending Today" shall return the top 5 most-ordered items from orders placed in the last 24 hours. |
| REQ-AI-04 | Items already in the cart or ordered in the current session shall be excluded from recommendation results. |
| REQ-AI-05 | Cold-start fallback (fewer than 10 completed orders): return globally most-ordered items sorted by frequency. |
| REQ-AI-06 | The recommendation engine shall be a Python Flask microservice, queried internally by Node.js. |
| REQ-AI-07 | The co-occurrence matrix shall be rebuilt every 30 minutes or triggered on-demand to reflect fresh SQLite data. |

### 5.2 Peak Hour Prediction

| ID | Requirement |
|----|-------------|
| REQ-AI-08 | The system shall aggregate order timestamps from SQLite into hourly buckets (0–23) per day-of-week. |
| REQ-AI-09 | Predicted volume per hour shall be computed using a weighted rolling average with exponential decay (higher weight for recent weeks). |
| REQ-AI-10 | Output shall be a 24-element array of predicted order volumes, visualised as a bar chart on the admin analytics page. |
| REQ-AI-11 | Peak windows are hours where predicted volume > mean + 0.5 × standard deviation. |
| REQ-AI-12 | The Node.js backend shall poll `/ai/peak-hours` every 30 minutes and emit an admin Socket.IO alert when the next 30-minute window is a predicted peak. |
| REQ-AI-13 | The prediction module shall use only NumPy and Pandas — no external ML training pipeline required. |

---

## 6. Interface Requirements

### 6.1 Page Inventory

**Customer Portal (Mobile-First)**

| Route | Description |
|-------|-------------|
| `/menu/:tableId` | Menu page — auto-resolves table, category tabs, search, Veg toggle, AI recommendation banner |
| `/cart` | Cart — itemised list with per-item notes, order total, Place Order CTA |
| `/order-status/:orderId` | Live KOT status — animated stepper: Placed → KOT Sent → Preparing → Ready |
| `/recommendations` | Full "For You" page — personalised picks + trending today |

**Admin Portal (Desktop-First)**

| Route | Description |
|-------|-------------|
| `/admin/login` | Secure admin login |
| `/admin/dashboard` | KPI cards, predicted peak, live order feed |
| `/admin/orders` | Full order/KOT table with filters and bulk status update |
| `/admin/menu` | Menu CRUD — rich add/edit/delete form with image and tag support |
| `/admin/tables` | Table list with QR code generator and occupancy status |
| `/admin/analytics` | Revenue charts, top dishes, category split, peak hour heatmap |
| `/admin/kot-history` | KOT audit log with date, table, and status filters |

**Kitchen Display System (Tablet-Optimised)**

| Route | Description |
|-------|-------------|
| `/kitchen` | Live KOT board — real-time ticket cards, audio alert, status action buttons |
| `/kitchen/history` | Completed KOTs for current shift |

### 6.2 API Interface Design
- REST API following JSON:API conventions.
- Socket.IO for all real-time events (orders, KOT status, menu availability).
- Flask AI microservice: internal REST, called only by Node.js — not exposed to the client directly.

### 6.3 Hardware Interface
- **Customer:** Smartphone with camera (QR scan) + modern mobile browser.
- **Kitchen Staff:** Tablet (10"+) in landscape orientation, wall-mounted or stand-mounted in kitchen.
- **Admin:** Desktop/laptop browser.

---

## 7. Data Requirements

### 7.1 Core Entities

| Entity | Key Fields |
|--------|-----------|
| `menu_items` | id, name, description, price, category, image_url, is_veg, tags, is_available, created_at |
| `tables` | id, table_number, qr_code_url, is_occupied |
| `orders` | id, table_id (FK), status, total_amount, placed_at, updated_at |
| `order_items` | id, order_id (FK), menu_item_id (FK), quantity, special_notes |
| `kot` | id, kot_number, order_id (FK), table_id (FK), status, generated_at, updated_at |
| `admins` | id, email, password_hash, role, created_at |

### 7.2 Socket.IO Event Map

| Event Name | Direction | Payload |
|-----------|-----------|---------|
| `kot:new` | Server → KDS + Admin | Full KOT object with items and table info |
| `kot:statusUpdate` | Server → Customer + Admin | `{ kotId, orderId, newStatus, tableId }` |
| `kot:statusChanged` | KDS → Server | `{ kotId, newStatus }` |
| `menu:updated` | Server → Customer (all) | `{ itemId, isAvailable }` |
| `table:statusChanged` | Server → Admin | `{ tableId, isOccupied }` |
| `admin:peakAlert` | Server → Admin | `{ predictedHour, message }` |

### 7.3 SQLite Configuration
- Mode: WAL (Write-Ahead Logging) enabled via `PRAGMA journal_mode=WAL;`
- Location: `/server/data/restaurant.db`
- Migrations: versioned SQL files in `/server/migrations/`
- ORM/Query Builder: `better-sqlite3` (synchronous, best for Node.js) or `Prisma` with SQLite adapter

---

## 8. Constraints & Assumptions

### 8.1 Constraints
- SQLite is the sole database engine; no separate database server is required or supported in this version.
- Deployment is out of scope for this document version; the system is designed to run locally via `npm run dev`.
- Image storage uses the local filesystem (`/server/uploads/`) for development purposes.
- The AI service requires a minimum of 10 completed orders to produce non-trivial recommendations; below this threshold it falls back to popularity ranking.

### 8.2 Assumptions
- Customers access the system via a mobile browser after scanning the table QR code — no native app required.
- The restaurant is a single-location setup with a fixed set of admin-managed tables.
- Kitchen staff have a dedicated tablet or screen in the kitchen for KDS access.
- Table QR codes are printed and physically placed at each table; they are re-downloaded from the admin panel as needed.
- The system is designed for a college project demo; production-scale load testing is out of scope.

---

## 9. Glossary

| Term | Meaning |
|------|---------|
| KOT | Kitchen Order Ticket — a uniquely numbered digital ticket sent to the kitchen for each order |
| KDS | Kitchen Display System — the screen in the kitchen displaying live KOTs |
| QR Auto-Resolution | Reading the table ID directly from the QR URL parameter, eliminating manual table number entry |
| Collaborative Filtering | Recommendation approach using item co-occurrence patterns across historical orders |
| Co-occurrence Matrix | Matrix where cell [i][j] = count of orders containing both item i and item j |
| Exponential Decay | Weighting function that assigns higher importance to recent data over older data |
| Peak Hour | A predicted hourly window where order volume exceeds mean + 0.5 × standard deviation |
| WAL Mode | Write-Ahead Logging — SQLite concurrency mode allowing simultaneous reads during writes |
| Skeleton Screen | A UI loading state that renders a layout-matching placeholder instead of a generic spinner |
| Cold-Start | The state where insufficient order history exists to compute meaningful AI recommendations |

---

*End of Requirements Document — v2.0*
