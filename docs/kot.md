# Kitchen Order Ticket (KOT) System

## How KOT Works in This System
When a customer (or waiter) places an order from the digital menu, the system immediately generates a unique KOT number and logs the required dishes into the `kot` database table. Simultaneously, it broadcasts a real-time event via Socket.IO to the `/kitchen` namespace. The Kitchen Display System (KDS) running on the Kitchen Portal listens for these events and instantly displays the new ticket for the chefs.

## Setup Requirements
1. **Infrastructure**: 
   - A centralized server running Node.js + Express.
   - Socket.IO installed for bi-directional real-time communication.
   - A persistent database (SQLite used here) with a dedicated `kot` table.
2. **Kitchen Hardware**: 
   - A tablet or display monitor inside the kitchen facing the chefs, running the Kitchen Portal URL (`http://localhost:5173/kitchen`).
3. **Network**:
   - Reliable internal Wi-Fi network so the kitchen display and customer phones/waiter devices can connect to the server without high latency.

## Does the Current Project Satisfy These Requirements?
**Yes.** The current project fully implements and satisfies all KOT system requirements:
- Real-time KOT generation is fully active via Socket.IO.
- The `kotController` tracks tickets across multiple states (`received` -> `preparing` -> `ready` -> `served`).
- The Kitchen Board UI correctly segments and visualizes tickets and lets chefs update their statuses, which then automatically reflects on the customer's phone and the Admin Dashboard.
