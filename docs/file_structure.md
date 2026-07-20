# Project Architecture & File Structure Guide
**Yummy Bites: AI-Based Smart Restaurant Management System**

This document serves as a complete map of the codebase. It details the exact purpose of every major folder and file within the `client`, `server`, and `ai-service` environments, demonstrating the massive scale and decoupled nature of the microservices architecture.

---

## 1. `ai-service/` (The Artificial Intelligence Microservice)
This directory contains the independent Python machine learning engine. It is separated from the Node.js backend so that heavy mathematical computations do not block the main server.

* **`app.py`**  
  The main entry point for the Flask web server. It defines the REST API routes (e.g., `/ai/recommendations`) that the Node.js server communicates with to fetch intelligent data.
* **`recommender.py`**  
  The core AI logic file. This contains the `Recommender` class that executes the **Collaborative Filtering** algorithm (analyzing cart items against historical order frequency to suggest the top 5 most highly correlated items). It also contains the fallback logic for the "Trending Today" algorithm.
* **`db.py`**  
  The database connection handler for Python. It establishes a read-only connection to the SQLite database so the AI can securely fetch historical order data without interfering with the Node.js write operations.
* **`requirements.txt`**  
  The Python package dependency file (listing Flask, SQLite drivers, and data processing libraries) required to boot the AI environment.

---

## 2. `server/` (The Node.js API & Real-Time Backend)
This is the central nervous system of the platform. It handles all HTTP traffic, manages WebSockets, enforces security, and writes to the database.

* **`index.js`**  
  The absolute root of the backend. It initializes the Express.js application, configures CORS, sets up the `Socket.io` real-time WebSocket server, applies JWT middleware, and binds all routing files.
* **`package.json`**  
  Lists all Node.js dependencies (`express`, `socket.io`, `better-sqlite3`, `jsonwebtoken`, etc.) and the PM2 startup scripts.

### 2.1 `server/controllers/` (Business Logic)
Controllers contain the actual complex programming logic and SQL queries executed when an API endpoint is hit.
* **`analyticsController.js`**  
  Contains massive relational SQL `JOIN` queries. It calculates Total Revenue, Total Orders, and uniquely calculates **Net Profit** by subtracting the exact `cost_price` of individual items from gross sales. It also generates the Top 5 Dishes and Category Revenue data.
* **`authController.js`**  
  Handles login functionality. Verifies admin/waiter passwords and generates secure, stateless JSON Web Tokens (JWT) for authentication.
* **`menuController.js`**  
  Handles the CRUD (Create, Read, Update, Delete) logic for the menu. It manages base menu items, categories, and complex dynamic variant/add-on structures.
* **`orderController.js`**  
  The most critical transactional file. When an order is placed, it saves the data, takes a permanent "snapshot" of the exact Cost Price for historical accuracy, and emits a WebSocket event to the Kitchen display.
* **`tableController.js`**  
  Manages table statuses and utilizes logic to map specific sessions to physical restaurant tables.

### 2.2 `server/routes/` (API Routing)
These files map specific HTTP URLs to the functions inside the controllers.
* **`analyticsRoutes.js`, `authRoutes.js`, `menuRoutes.js`, `orderRoutes.js`**  
  Defines endpoints like `GET /api/menu`, `POST /api/orders`, etc., and applies necessary security middleware to protect them.

### 2.3 `server/db/` (Database Architecture)
* **`index.js`**  
  Bootstraps the `better-sqlite3` driver. Critically, this file configures the database to use **WAL (Write-Ahead Logging) mode**, ensuring the server can handle high concurrency (multiple users ordering at the exact same time) without locking.
* **`migrations/001_init.sql`**  
  The master schema file. It contains the raw SQL commands that define the strict relational tables (`users`, `menu_items`, `variants`, `orders`, `order_items`) and their foreign-key constraints.

### 2.4 `server/data/` (Physical Storage)
* **`restaurant.db`**  
  The actual, physical SQLite database file holding all live production data.
* **`restaurant.db-wal` & `restaurant.db-shm`**  
  The temporary Write-Ahead Log files that allow the database to process transactions at lightning speed before committing them to the main `.db` file.

### 2.5 `server/middleware/` (Security)
* **`authMiddleware.js`**  
  A security guard script. Before the server processes an admin or waiter request, this script intercepts the request, verifies the JWT signature, and instantly rejects unauthorized hackers with a `401 Unauthorized` status.

---

## 3. `client/` (The React.js Frontend Application)
This directory contains the entire visual application seen by Customers, Waiters, Chefs, and Admins. It is a highly optimized Single Page Application (SPA).

* **`vite.config.js`**  
  The configuration file for Vite, the ultra-fast build tool used to compile the React code for production deployment.
* **`tailwind.config.js`**  
  Contains the configuration for the Tailwind CSS framework, defining the exact brand colors (like the specific `amber-500` used throughout the app) and dark-mode parameters.

### 3.1 `client/src/` (Core Application)
* **`main.jsx`**  
  The React DOM entry point that injects the entire application into the HTML file.
* **`App.jsx`**  
  The master router file. It defines the URL structure of the app, protecting `/admin` routes behind login screens while leaving `/table/:id` routes open to the public.
* **`api.js`**  
  A configured `Axios` instance. It handles all outgoing HTTP requests to the Node.js backend and automatically attaches the JWT security token to every request header.

### 3.2 `client/src/pages/` (Visual Views)
* **`admin/AnalyticsPage.jsx`**  
  The dashboard view. Utilizes `Recharts` to render the interactive Bar Charts and Donut Charts representing revenue and Net Profit data.
* **`admin/MenuManagementPage.jsx`**  
  The complex UI allowing admins to add items, upload images, construct dynamic variants, and set explicit Cost vs. Selling prices.
* **`admin/TablesPage.jsx`**  
  The UI that uses the HTML5 Canvas API to programmatically generate and download physical, branded QR codes for newly added tables.
* **`admin/KitchenPage.jsx`**  
  The Live KOT (Kitchen Order Ticket) Display. It acts as a WebSocket client, passively listening for incoming orders and immediately rendering them on screen for the chefs without ever refreshing the browser.
* **`customer/MenuPage.jsx`**  
  The primary customer interface. It fetches the menu, sorts it beautifully, and displays the "Top Picks For You" section driven by the Python AI API.
* **`customer/CartPage.jsx`**  
  The digital checkout flow. It aggregates the base items and the complex add-ons, calculating the exact total mathematically before submitting the payload securely to the backend.

### 3.3 `client/src/components/` (Reusable UI Elements)
* **Layout Wrappers (`AdminLayout.jsx`, `CustomerLayout.jsx`)**  
  These components provide the consistent navigation sidebars, headers, and background themes so code isn't duplicated across every single page.
* **`CartDrawer.jsx`**  
  The sleek, sliding modal UI that appears when a customer wants to view their current order status. 
* **`VariantSelector.jsx`**  
  The complex popup interface that handles the logic of a user selecting multiple add-ons (like Extra Cheese) and instantly updating the live price on the screen.
