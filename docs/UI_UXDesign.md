# Bistro Moderne - UI/UX Design System

This document outlines the core design language, color palettes, and interactive elements used to build the premium "Bistro Moderne" digital menu experience. The goal of this design is to evoke a high-end, sophisticated, and modern restaurant atmosphere through a dark UI.

## 🎨 Color Palette

The interface relies on a deep, monochromatic dark base contrasted by a vibrant, warm accent color to draw attention to interactive elements and pricing.

### Base Colors (Dark Theme)
- **App Background:** `#0F0F0F` — A near-black charcoal that provides depth without the harshness of absolute black.
- **Card / Surface Background:** `#1A1A1A` — Slightly elevated gray used for menu item cards, search bars, and floating elements.
- **Deep Surface / Inputs:** `#111111` — Used within modals and text areas to create inset depth.
- **Borders & Dividers:** `#222222` — Very subtle delineators that don't distract from the photography.

### Accent Color
- **Primary Accent (Peach/Salmon):** `#FFA685`
  - *Usage:* Branding text, active category underlines, primary call-to-action buttons (like the `+` add button), and prices.
  - *Hover State:* Transitions to slightly dimmer opacity or darker tones depending on the element.

### Typography Colors
- **Primary Text:** `#FFFFFF` (White) — Used for dish names and primary headers.
- **Secondary Text:** `text-gray-300`, `text-gray-400` — Used for descriptions, secondary labels, and inactive categories.
- **Muted Text:** `text-gray-500` — Used for placeholders and subtle metadata.

---

## 🔤 Typography System

A dual-font approach is used to balance elegance with modern readability. Fonts are served via Google Fonts.

1. **Serif (Playfair Display)**
   - *Vibe:* Elegant, Classic, High-End.
   - *Usage:* Application Header ("Bistro Moderne"), Category Titles, and "Chef's Specials" headers.
   - *Styling:* Often paired with `tracking-widest` or `uppercase` for a curated editorial look.
   
2. **Sans-Serif (Inter)**
   - *Vibe:* Clean, Modern, Highly Legible.
   - *Usage:* All body copy, dish descriptions, buttons, tags, and UI elements.
   - *Styling:* Heavily relies on font weights (`font-bold` vs `font-medium`) to establish visual hierarchy without changing sizes drastically.

---

## 📐 Layout & Grid Architecture

The application employs a "mobile-first but desktop-perfect" responsive philosophy.

- **Global Container:** `max-w-7xl mx-auto` — Prevents ultra-wide stretching on large monitors.
- **Main Menu Grid:** 
  - Uses CSS Grid to dynamically scale the number of items based on screen real estate:
  - Mobile: `grid-cols-2`
  - Tablet: `sm:grid-cols-3 md:grid-cols-4`
  - Desktop: `lg:grid-cols-5 xl:grid-cols-6`
- **Image Aspect Ratios:** Product images scale proportionally based on the viewport (`h-36` on mobile up to `md:h-48` on desktop) ensuring beautiful food photography is never skewed or cropped poorly.

---

## ✨ Animations & Micro-Interactions (Framer Motion)

Animations are physics-based to feel organic, snappy, and premium rather than linear and robotic.

- **Tap Responses:** Interactive elements (cards, buttons, category headers) slightly compress (`scale: 0.98`) when tapped/clicked to provide tactile feedback.
- **Desktop Hover States:** 
  - Cards elegantly float upwards (`-translate-y-1`).
  - Shadows deepen (`shadow-xl shadow-black/50`) to separate the card from the dark background.
  - Image scaling: Images slightly zoom in (`scale-110`) inside their containers when the card is hovered.
- **Modals (Bottom Sheet):** The customization menu slides up from the bottom of the screen using a physics spring animation (`type: "spring", damping: 25, stiffness: 300`) to mimic native iOS app behavior.

---

## 🧩 Key UI Components

1. **Category Navigation:** 
   - Moved away from clunky background "pills". Uses elegant capitalized text that indicates active state via a sharp bottom border (`border-b-2 border-[#FFA685]`).
2. **Item Cards:** 
   - A unified block (`rounded-2xl`) with the image bleeding to the top edges.
   - The primary action (Add to cart) is a floating circular `+` button positioned absolutely over the bottom right corner of the image, breaking the grid for visual interest.
3. **Tags:** 
   - Dietary preferences (Veg/Non-Veg) are implemented as ultra-small, high-contrast badges (e.g., green text on dark green background with a subtle border) to not overpower the design.
4. **Customization Modal:**
   - Features a massive `border-radius` (`rounded-t-3xl`) for a modern, friendly feel.
   - Replaces standard HTML checkboxes with custom-styled dark UI toggles where active states are filled with the `#FFA685` accent color.
