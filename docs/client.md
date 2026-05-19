# Client Architecture & File Structure
**Byte Cafe: Frontend Application Mapping**

This document details the structure of the React.js frontend application (`client/` directory). It is built as a highly optimized Single Page Application (SPA) using Vite and Tailwind CSS.

---

## 1. Core Configuration Files
* **`vite.config.js`**  
  The configuration file for Vite, the ultra-fast build tool used to compile the React code for production deployment and handle Hot Module Replacement (HMR) during development.
* **`tailwind.config.js`**  
  Contains the configuration for the Tailwind CSS framework, defining the exact brand colors (like the specific `amber-500` used throughout the app), font families, and dark-mode parameters.
* **`package.json`**  
  Lists all frontend dependencies including React, Recharts, Framer Motion, and React Router.

---

## 2. Main Application Roots (`src/`)
* **`main.jsx`**  
  The React DOM entry point that injects the entire React application into the `index.html` file.
* **`App.jsx`**  
  The master router file. It defines the URL structure of the app using React Router. It securely protects `/admin` routes behind login screens while leaving `/table/:id` routes open to the public.
* **`api.js`**  
  A configured `Axios` instance. It handles all outgoing HTTP requests to the Node.js backend and automatically attaches the JWT security token to every request header using interceptors.

---

## 3. Visual Pages (`src/pages/`)
These files represent the actual screen views the user navigates to.

### 3.1 Customer Pages (`src/pages/customer/`)
* **`MenuPage.jsx`**  
  The primary customer interface. It fetches the menu, sorts it visually, and dynamically renders the "Top Picks For You" section which is driven by the Python AI API.
* **`CartPage.jsx`**  
  The digital checkout flow. It aggregates the base items and the complex add-ons, calculating the exact total mathematically before submitting the payload securely to the backend.

### 3.2 Admin & Staff Pages (`src/pages/admin/`)
* **`AnalyticsPage.jsx`**  
  The main command center dashboard. Utilizes `Recharts` to render interactive Donut Charts and Bar Charts representing revenue, Top Dishes, and Net Profit data.
* **`MenuManagementPage.jsx`**  
  The complex CRUD UI allowing admins to add items, construct dynamic variants, and set explicit Cost vs. Selling prices.
* **`TablesPage.jsx`**  
  The UI that uses the HTML5 Canvas API to programmatically generate and download physical, branded QR codes for newly added tables.
* **`KitchenPage.jsx`**  
  The Live KOT (Kitchen Order Ticket) Display. It acts as a WebSocket client, passively listening for incoming orders and immediately rendering them on screen for the chefs without ever refreshing the browser.

---

## 4. Reusable UI Components (`src/components/`)
* **`AdminLayout.jsx` & `CustomerLayout.jsx`**  
  These layout wrappers provide the consistent navigation sidebars, headers, and background themes so code isn't duplicated across every single page.
* **`CartDrawer.jsx`**  
  The sleek, sliding modal UI that appears when a customer taps the cart icon to view their current order status. 
* **`VariantSelector.jsx`**  
  The complex popup interface that handles the logic of a user selecting multiple add-ons (like Extra Cheese) and instantly updates the live price mathematically on the screen.
