# Todo List - Restaurant Management System

## Modifier & Customization Fixes

- [x] **KOT: Show all modifiers** — If customer adds "Garlic Naan (Less Spicy, Jain)", KOT card must show all modifiers, not just the item name
- [x] **KOT: Multiple modifiers visible** — When 2+ choices selected (e.g., Less Spicy + Jain), all must display in KOT, not just one
- [x] **Cart: Added extra quantity** — Suppose, i added 1 butter naan with extra butter, then i added 1 more butter naan with no butter, the cart should be able to show customer 2 different types of butter naan also admin & kot should also be able to differentiate it
- [x] **Admin Orders: Show modifiers** — Admin orders table must display item modifiers alongside item names
- [x] **Cart: Apply instructions at selection time** — Special instructions set in MenuPage customization modal must apply immediately when adding to cart, not only in cart page

## Billing & Table Management

- [x] **Billing: Highlight bill-requested tables** — When customer requests bill, that table must visually change (color highlight/badge) in admin billing page
- [x] **Billing: Eliminate notification** — Bill request notification must pop up in admin panel (was working before) should be stopped for admin panel
- [x] **Menu Page: Add bill request icon** — Small icon near cart icon in customer menu header
- [x] **Menu Page: Bill request popup** — Icon click shows popup with "Request Bill" / "Bill Please" button
- [x] **Menu Page: Success feedback** — After clicking, show "Request sent successfully" then popup auto-closes
- [x] **Menu Page: Show bill amount** — Popup displays current bill total from all orders placed at that table

## Admin Order Details

- [x] **Orders: Clickable table numbers** — Admin clicks table number → popup/modal opens with full table details
- [x] **Orders: Show items with modifiers** — Detail popup shows items as "Garlic Naan (Less Spicy)" instead of plain item name
- [x] **Orders: Show quantities** — Each item shows quantity count in detail popup
- [x] **Orders: Show modifications** — All modifications clearly visible per item in detail popup

## Timestamps

- [x] **All pages: IST timestamps** — Convert all time displays to Indian Standard Time (UTC+5:30)
- [x] **KOT: IST elapsed time** — "X min ago" on KOT cards uses IST
- [x] **Admin Orders: IST time column** — Time shown in IST format (e.g., "2:45 PM")
- [x] **Billing: IST order times** — All order timestamps in billing page use IST

## QR Code Management

- [x] **Tables: Download QR button** — Each table in admin table management shows download option
- [x] **Tables: QR downloads as image** — QR downloads as PNG file named `table-{number}-qr.png`

## Veg Type Customization

- [x] **Veg items: Replace spice level with food type** — Veg items now show Regular / Jain / Half Jain (No Onion & Garlic) options instead of spice level
- [x] **Non-veg items: Remove spice level** — Non-veg items no longer show spice level option in customization modal

## Image Upload

- [x] **Menu management: Drag & drop image upload** — Admin can drag & drop images when adding/editing menu items
- [x] **Menu management: Image preview** — Shows preview of selected/dropped image with option to remove
- [x] **Menu management: URL fallback** — Can still paste image URL as alternative to upload
