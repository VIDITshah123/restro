# Server Architecture & File Structure
**Yummy Bites: Backend & AI Microservice Mapping**

This document details the backend infrastructure of the application, encompassing both the Node.js Real-Time API (`server/`) and the independent Python Machine Learning Engine (`ai-service/`).

---

## Part 1: `server/` (The Node.js API & Real-Time Backend)
This is the central nervous system of the platform. It handles all HTTP traffic, manages WebSockets, enforces security, and executes writes to the database.

* **`index.js`**  
  The absolute root of the backend. It initializes the Express.js application, configures CORS, sets up the `Socket.io` real-time WebSocket server, applies JWT middleware, and binds all routing files.
* **`package.json`**  
  Lists all Node.js dependencies (`express`, `socket.io`, `better-sqlite3`, `jsonwebtoken`, etc.).

### 1.1 Business Logic (`server/controllers/`)
Controllers contain the complex programming logic and SQL queries executed when an API endpoint is hit.
* **`analyticsController.js`**  
  Contains massive relational SQL `JOIN` queries. It calculates Total Revenue, Total Orders, and uniquely calculates **Net Profit** by subtracting the exact `cost_price` of individual items from gross sales. 
* **`authController.js`**  
  Handles login functionality. Verifies admin/waiter passwords and generates secure, stateless JSON Web Tokens (JWT) for authentication.
* **`menuController.js`**  
  Handles the CRUD (Create, Read, Update, Delete) logic for the menu. It manages base menu items, categories, and complex dynamic variant/add-on structures.
* **`orderController.js`**  
  The most critical transactional file. When an order is placed, it saves the data, takes a permanent "snapshot" of the exact Cost Price for historical accuracy, and emits a WebSocket event to the Kitchen display.
* **`tableController.js`**  
  Manages table statuses and mapping specific sessions to physical restaurant tables.

### 1.2 API Routing (`server/routes/`)
These files map specific HTTP URLs to the functions inside the controllers.
* **`analyticsRoutes.js`, `authRoutes.js`, `menuRoutes.js`, `orderRoutes.js`**  
  Defines endpoints like `GET /api/menu`, `POST /api/orders`, etc., and applies necessary security middleware to protect them.

### 1.3 Database Architecture (`server/db/`)
* **`index.js`**  
  Bootstraps the `better-sqlite3` driver. Critically, this file configures the database to use **WAL (Write-Ahead Logging) mode**, ensuring the server can handle high concurrency without locking.
* **`migrations/001_init.sql`**  
  The master schema file containing raw SQL commands that define the strict relational tables (`users`, `menu_items`, `variants`, `orders`, `order_items`).

### 1.4 Security (`server/middleware/`)
* **`authMiddleware.js`**  
  A security guard script. It intercepts requests, verifies the JWT signature, and instantly rejects unauthorized hackers with a `401 Unauthorized` status.

---

## Part 2: `ai-service/` (The Artificial Intelligence Microservice)
This directory contains the independent Python machine learning engine. It is completely isolated from Node.js so that heavy mathematical computations do not block the main server's event loop.

* **`app.py`**  
  The main entry point for the Flask web server. It defines the REST API routes (e.g., `/ai/recommendations`) that the Node.js server communicates with.
* **`recommender.py`**  
  The core AI logic file. This contains the `Recommender` class that executes the **Collaborative Filtering** algorithm (analyzing cart items against historical order frequency to suggest highly correlated items). It also contains the fallback logic for the "Trending Today" algorithm.
* **`db.py`**  
  The database connection handler for Python. It establishes a read-only connection to the SQLite database so the AI can securely fetch historical order data without interfering with Node.js write operations.
* **`requirements.txt`**  
  The Python package dependency file (listing Flask, SQLite drivers, and data processing libraries).
