# Byte Cafe Project Defense: Examiner Q&A Guide
**Comprehensive Interview Preparation Document**

This document contains a curated list of potential questions an external examiner might ask during your project defense, complete with the ideal, technically accurate answers you should provide.

---

## Part 1: Non-Technical & Business Strategy

### 1. What inspired you to build this specific system? What real-world problem does it solve?
**Answer:** The project was inspired by the massive inefficiencies in traditional dining. Customers often face long wait times to get menus, place orders, and receive their bills. Meanwhile, restaurants miss out on upselling opportunities and lack precise profit tracking. This system solves these issues by offering a zero-friction BYOD (Bring Your Own Device) QR ordering experience, real-time kitchen displays, and an AI-driven menu that acts as an automated digital waiter.

### 2. How is this different from existing POS (Point of Sale) systems?
**Answer:** Traditional POS systems are usually static, hardware-heavy, and used solely by the restaurant staff. Our system is an end-to-end ecosystem. It bridges the gap directly between the customer's personal device and the kitchen. Furthermore, standard POS systems calculate gross sales well, but our system uniquely calculates exact *Net Profit* by tracking the precise, fluctuating "Cost of Goods Sold" for every single add-on and variant applied to an order.

### 3. How does the AI Recommendation Engine actually increase the restaurant's revenue?
**Answer:** The AI acts as a smart up-seller. Instead of a static paper menu, the system analyzes what the user has currently placed in their digital cart and runs a collaborative filtering algorithm to suggest highly correlated pairings (e.g., suggesting a specific beverage that is historically purchased alongside a specific pizza). By presenting these tailored "Top Picks," it organically increases the Average Order Value (AOV) without requiring a human waiter to upsell.

---

## Part 2: Basic Functioning & Architecture

### 4. What is the overarching Technology Stack of this project?
**Answer:** The architecture is decoupled into distinct microservices:
* **Frontend:** React.js powered by Vite, styled with Tailwind CSS.
* **Backend API:** Node.js with Express.js.
* **Real-Time Engine:** WebSockets via Socket.io.
* **Database:** SQLite running in high-concurrency WAL (Write-Ahead Logging) mode.
* **AI Microservice:** Python running a Flask server.
* **Deployment:** Hosted on an AWS EC2 instance, managed by PM2, with Nginx acting as a reverse proxy.

### 5. How does the QR Code know which table the customer is sitting at?
**Answer:** When the Admin creates a new table in the dashboard, the system generates a unique Database ID for that table. We use the HTML5 Canvas API to dynamically generate a branded QR Code that embeds a specialized URL (e.g., `http://domain.com/table/5`). When the user scans it, the React router reads the URL parameter (`5`) and instantly assigns their session and cart to that specific table in the database.

---

## Part 3: Advanced Technical Implementations

### 6. How do you achieve real-time synchronization between the Customer, Waiter, and Kitchen without the page refreshing?
**Answer:** Instead of using inefficient HTTP Polling (where the browser asks the server for updates every few seconds), I implemented WebSockets using `Socket.io`. This establishes a persistent, bi-directional TCP connection. To make it highly scalable, I used "Multiplexing"—segmenting traffic into Namespaces (like `/kitchen`) and specific Rooms (like `table:5`). When a customer orders, an event is emitted directly to the specific rooms that need to know, instantly updating their UI without a page refresh.

### 7. Why did you choose to separate the AI logic into a Python Microservice instead of writing it in Node.js?
**Answer:** Node.js is incredibly fast for I/O operations (handling thousands of web requests), but it runs on a single thread. Machine Learning algorithms require heavy, blocking mathematical computations. If I ran the AI logic in Node.js, it would block the event loop and freeze the entire server. By offloading the AI to an independent Python Flask server, Node.js remains lightning-fast, while Python handles the heavy statistical lifting in the background.

---

## Category A: Black Box Testing & Edge Cases

### 8. What happens if multiple people sit at the same table and scan the QR code at the same time?
**Answer:** The system handles concurrent sessions flawlessly. The cart state is managed individually on each user's device. When they submit an order, the Node.js backend processes the incoming HTTP requests asynchronously. The SQLite database uses WAL (Write-Ahead Logging) mode, which prevents database locking, ensuring that all concurrent orders are processed and mapped to the same `tableId` without data corruption.

### 9. What happens if a customer adds an item to their cart, but the Admin marks it "Out of Stock" right before they hit checkout?
**Answer:** This is a classic race condition edge case. When the customer clicks "Checkout," the frontend doesn't just blindly trust the cart. It sends the cart payload to the Node.js API, which performs a strict, real-time validation check against the database. If an item is found to be out of stock, the API rejects the checkout process, throws a `400 Bad Request`, and alerts the user to update their cart.

### 10. What happens if the internet cuts out while the Chef is trying to mark an order as "Ready"?
**Answer:** The application logic handles network disconnects gracefully. If the Socket.io connection drops, it continually attempts to reconnect in the background. Once the internet is restored, the socket reconnects and fetches the absolute latest state from the REST API, ensuring the kitchen display remains perfectly accurate and no tickets are permanently lost.

---

## Category B: Database Schema Design

### 11. Why did you choose SQLite over PostgreSQL or MongoDB? And how did you handle concurrency?
**Answer:** SQLite is incredibly lightweight, requires zero complex server configuration, and resides directly on the file system, making it perfect for rapid deployment. However, its default configuration locks the entire database during a write operation. To solve this, I explicitly enabled **WAL (Write-Ahead Logging) mode**. WAL allows multiple readers to access the database at the exact same time a writer is modifying it, providing enterprise-grade concurrency suitable for a busy restaurant.

### 12. Explain the relationship between `menu_items`, `variants`, and `order_items`.
**Answer:** 
* `menu_items` holds the base entity (e.g., "Pizza") and its base price.
* `variants` is tied to `menu_items` via a Foreign Key and holds specific customizations (e.g., "12-Inch" or "Extra Cheese").
* When an order is placed, a record is created in `order_items`. This table links back to the menu item, but critically, it stores a permanent "snapshot" of the variants selected.

### 13. Why do you store the `cost_price` physically inside the `order_items` table instead of just looking it up in `menu_items` during Analytics?
**Answer:** This is a critical design decision for financial integrity. If the cost of ingredients rises in December, the admin will update the `cost_price` in the `menu_items` table. If our analytics dynamically looked up that cost, the profit calculations for orders placed back in July would suddenly change, ruining historical data. By taking a hard snapshot of the `cost_price` inside `order_items` at the exact second the order is placed, our historical Net Profit calculations remain 100% mathematically accurate forever.

---

## Category C: Backend & AI Services

### 14. Explain exactly how your AI Recommendation Algorithm works behind the scenes.
**Answer:** The Python AI service uses a collaborative filtering approach combined with frequency mapping. 
1. When a user is browsing, Node.js sends the user's current `cartItemIds` to the Python Flask API.
2. The Python script queries the SQLite database for all historically completed orders.
3. It iterates through the historical data to find out which items were most frequently purchased within the same exact order as the items currently in the user's cart.
4. It sorts this frequency matrix in descending order and returns the "Top 5" most mathematically probable items back to the user interface.

### 15. How does the AI handle the "Cold Start" problem (when the restaurant is brand new and has no historical orders)?
**Answer:** The Python recommender class contains a fallback mechanism. If the frequency matrix returns empty (because there are less than a threshold of historical orders), the AI automatically falls back to a "Trending Today" algorithm. It queries the database for the items with the highest sheer sales volume over the last 24 hours and recommends those instead, ensuring the UI always displays suggestions.

### 16. How did you structure your AWS Server to run Node.js, Python, and React simultaneously?
**Answer:** I utilized a microservices routing pattern using **Nginx** as a Reverse Proxy on the EC2 instance.
* All incoming traffic hits Nginx on Port 80.
* If the URL path starts with `/api/`, Nginx proxies the traffic to the Node.js server running on Port 3000.
* If the URL path starts with `/ai/`, Nginx proxies it to the Python Flask server running on Port 5000.
* For all other traffic, Nginx serves the static, compiled React build files directly from memory. 
* To ensure continuous uptime, both the Node and Python servers are managed by **PM2**, which automatically restarts them if a fatal error occurs.
