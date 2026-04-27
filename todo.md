# Todo - Restro Management System

## 1. Waiter Management
- [x] Admin can create waiter accounts (userid & password)
- [x] Admin can perform CRUD operations on waiter credentials
- [x] Waiter can login with their credentials
- [x] Waiter receives notification when their assigned order is ready for service
- [x] Waiter can mark order as served

## 2. KOT (Kitchen Order Ticket) Display
- [x] KOT must show dish specifications including:
  - Jain preference
  - No spice
  - Extra cheese
  - Any other custom modifications
- [x] Order should auto-remove from KOT display when "waiting for service" status is fulfilled
- [x] Completed orders should move to KOT history (not deleted from database)

## 3. Billing System
- [x] Orders and billing must be separate flows
- [x] Billing page displays tables with items ordered for the FIRST time only
- [x] Example: 3 friends (Vishnu, Purvi, Vidit) order at different times
  - Vidit orders 10 mins after Vishnu & Purvi
  - Billing page shows Vishnu & Purvi's items (not Vidit's until he bills separately)
  - so i mean to say that, till the table is billed, it should include all the orders from the first order placed when the table was free
- [x] Each customer/group can be billed independently
- [x] When billed, order is removed from billing page
- [x] After billing: table status changes to 'free'
- [x] Billed orders move to order history (NOT deleted from database)
- [x] Billing page accessible only to admin

## 4. Menu Variants
- [x] Admin can add multiple variants of a dish with different prices
- [x] Example: Peri Peri Fries
  - Base: ₹100
  - With cheese dip: ₹120
  - With mayonnaise: ₹150
- [x] Variants display as single menu item with price options
- [x] When customer scans QR code, menu shows all variants with prices
- [x] KOT display shows variant name alongside dish name for kitchen clarity