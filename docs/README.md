# AI-Powered Smart Restaurant Management System

A full-stack, real-time restaurant management solution designed to streamline the entire dining experience—from customer ordering and kitchen management to billing and AI-powered analytics. 

## 🌟 Key Features

- **Customer Portal & QR Code Ordering:** Customers can scan a table-specific QR code to browse the menu, customize orders (e.g., "Jain", "Less Spicy"), and place orders directly to the kitchen.
- **Kitchen Display System (KOT Board):** Real-time Kitchen Order Tickets (KOT) board. Highlights dietary restrictions automatically (e.g., Jain dishes in Red, Half Jain in Yellow) and tracks order preparation times.
- **Waiter Dashboard:** Real-time notifications for waiters when orders are marked "Ready" by the kitchen.
- **Advanced Admin Dashboard:**
  - **Tables Management:** Live view of occupied/free tables, QR code generation, and direct order placement.
  - **Billing System:** Independent billing workflows allowing admins to generate consolidated table bills when customers are ready to leave. Waiter and customer bill request alerts (pulsing red dot notifications).
  - **Menu Management:** Full CRUD operations for menu items and dynamic variants (e.g., portions, add-ons).
  - **Waiters Management:** Create and manage waiter credentials.
  - **Analytics:** Real-time revenue tracking, top-selling items, and daily order statistics.
- **AI Service Integration:** Python-based AI service for menu recommendations, trending items, and peak hour predictions.

## 💻 Tech Stack

### Frontend (Client)
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Animations:** Framer Motion
- **Routing:** React Router v6
- **Real-time:** Socket.IO Client
- **Icons:** Lucide React

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite3 (`better-sqlite3`) with WAL mode for concurrent access
- **Real-time:** Socket.IO
- **Auth:** JSON Web Tokens (JWT) & bcrypt

### AI Service
- **Runtime:** Python
- **Framework:** Flask

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.9 or higher)

### 1. Database & Server Setup
```bash
cd server
npm install
npm start
```
*Note: The server will automatically create the SQLite database (`data/restaurant.db`) and run initial migrations.*

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`*

### 3. AI Service Setup
```bash
cd ai-service
# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt
python app.py
```
*The AI service will run on `http://127.0.0.1:5000`*

## 🔑 Default Accounts
- **Admin Login:** 
  - Email: `admin@restro.com`
  - Password: `admin123`

## 📡 WebSockets Architecture
The application utilizes Socket.IO namespaces to keep concerns separated and optimized:
- `/customer` - Order status updates sent to the customer's phone.
- `/kitchen` - Global namespace for KOT board.
- `/waiter` - Receives "Order Ready" alerts from the kitchen.
- `/admin` - Global updates for table occupancy, bill requests, and new orders.
