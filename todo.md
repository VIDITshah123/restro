# Todo - Restro Management System

## 1. Admin Order & Billing Management
- [x] Admin can view all orders with customer details (who ordered what)
- [x] Admin can generate bills for individual tables after order is placed
- [x] Admin can change table status:
  - 'free' → 'occupied' when customer places order
  - 'occupied' → 'free' after bill is generated
- [x] Ordered items during the dining session are added to the bill for the respective table

## 2. Order Details Display
- [x] Admin can view detailed order information including:
  - Which table ordered what item
  - Who placed the order (customer/table number)
  - Special requirements (e.g., Jain, non-Jain, no spice, extra cheese, etc.)

## 3. KOT Setup Documentation
- [x] Create kot.md file explaining:
  - How to set up Kitchen Order Ticket (KOT) system
  - How KOT will work
  - Requirements needed
  - Whether the current project satisfies KOT requirements

## 4. Customer Bill Request Feature
- [x] Customer can request bill from their end
- [x] When clicked, admin receives notification that table needs billing
- [x] Notification should indicate which table number

## 5. Waiter Order Management
- [x] Waiter can manually place orders for any table
- [x] Waiter selects table number from available tables
- [x] Waiter selects items from menu
- [x] Waiter can add special instructions per item (Jain, non-Jain, etc.)
- [x] Order is sent to kitchen and reflects in admin dashboard
