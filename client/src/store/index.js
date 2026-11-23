import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist((set) => ({
  token: null,
  role: null,
  email: null,
  name: null,
  waiterId: null,
  permissions: {
    can_place_order: true,
    can_cancel_order: false,
    can_place_online_order: false,
    can_place_takeaway_delivery: false
  },
  login: (token, role, emailOrName, permissions = null, waiterId = null) => set({
    token,
    role,
    email: typeof emailOrName === 'string' && emailOrName.includes('@') ? emailOrName : null,
    name: typeof emailOrName === 'string' && !emailOrName.includes('@') ? emailOrName : (emailOrName || 'Staff'),
    waiterId: waiterId || null,
    permissions: permissions || {
      can_place_order: true,
      can_cancel_order: false,
      can_place_online_order: false,
      can_place_takeaway_delivery: false
    }
  }),
  logout: () => set({
    token: null,
    role: null,
    email: null,
    name: null,
    waiterId: null,
    permissions: {
      can_place_order: true,
      can_cancel_order: false,
      can_place_online_order: false,
      can_place_takeaway_delivery: false
    }
  })
}), { name: 'restro-auth-storage' }));

export const useSessionStore = create(persist((set) => ({
  tableId: null,
  tableNumber: null,
  setTable: (tableId, tableNumber) => set({ tableId, tableNumber }),
  clearTable: () => set({ tableId: null, tableNumber: null })
}), { name: 'restro-session-storage' }));

export const useCartStore = create(persist((set, get) => ({
  items: [], // { menuItemId, name, price, quantity, specialNotes, is_veg }
  addItem: (item) => set((state) => {
    // Match by menuItemId AND specialNotes so same dish with different mods stays separate
    const existing = state.items.find(i => 
      i.menuItemId === item.menuItemId && i.specialNotes === (item.specialNotes || '')
    );
    if (existing) {
      return {
        items: state.items.map(i => 
          i.menuItemId === item.menuItemId && i.specialNotes === (item.specialNotes || '')
            ? { ...i, quantity: i.quantity + (item.quantity || 1) } 
            : i
        )
      };
    }
    return { items: [...state.items, { ...item, quantity: item.quantity || 1, specialNotes: item.specialNotes || '' }] };
  }),
  removeItem: (menuItemId, specialNotes) => set((state) => ({
    items: state.items.filter(i => !(i.menuItemId === menuItemId && i.specialNotes === specialNotes))
  })),
  updateQuantity: (menuItemId, delta, specialNotes) => set((state) => ({
    items: state.items.map(i => {
      if (i.menuItemId === menuItemId && i.specialNotes === specialNotes) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    })
  })),
  updateNotes: (menuItemId, specialNotes, oldNotes) => set((state) => ({
    items: state.items.map(i => 
      i.menuItemId === menuItemId && i.specialNotes === oldNotes 
        ? { ...i, specialNotes } 
        : i
    )
  })),
  clearCart: () => set({ items: [] }),
  getTotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}), { name: 'restro-cart-storage' }));

export const useOrderStore = create(persist((set) => ({
  currentOrder: null, // { orderId, status }
  setOrder: (orderId, status) => set({ currentOrder: { orderId, status } }),
  updateOrderStatus: (status) => set((state) => ({
    currentOrder: state.currentOrder ? { ...state.currentOrder, status } : null
  })),
  clearOrder: () => set({ currentOrder: null })
}), { name: 'restro-order-storage' }));
