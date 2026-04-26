import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist((set) => ({
  token: null,
  role: null,
  email: null,
  login: (token, role, email) => set({ token, role, email }),
  logout: () => set({ token: null, role: null, email: null })
}), { name: 'auth-storage' }));

export const useSessionStore = create(persist((set) => ({
  tableId: null,
  tableNumber: null,
  setTable: (tableId, tableNumber) => set({ tableId, tableNumber }),
  clearTable: () => set({ tableId: null, tableNumber: null })
}), { name: 'session-storage' }));

export const useCartStore = create(persist((set, get) => ({
  items: [], // { menuItemId, name, price, quantity, specialNotes, is_veg }
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.menuItemId === item.menuItemId);
    if (existing) {
      return {
        items: state.items.map(i => 
          i.menuItemId === item.menuItemId 
            ? { ...i, quantity: i.quantity + (item.quantity || 1) } 
            : i
        )
      };
    }
    return { items: [...state.items, { ...item, quantity: item.quantity || 1, specialNotes: '' }] };
  }),
  removeItem: (menuItemId) => set((state) => ({
    items: state.items.filter(i => i.menuItemId !== menuItemId)
  })),
  updateQuantity: (menuItemId, delta) => set((state) => ({
    items: state.items.map(i => {
      if (i.menuItemId === menuItemId) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    })
  })),
  updateNotes: (menuItemId, specialNotes) => set((state) => ({
    items: state.items.map(i => i.menuItemId === menuItemId ? { ...i, specialNotes } : i)
  })),
  clearCart: () => set({ items: [] }),
  getTotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}), { name: 'cart-storage' }));

export const useOrderStore = create(persist((set) => ({
  currentOrder: null, // { orderId, status }
  setOrder: (orderId, status) => set({ currentOrder: { orderId, status } }),
  updateOrderStatus: (status) => set((state) => ({
    currentOrder: state.currentOrder ? { ...state.currentOrder, status } : null
  })),
  clearOrder: () => set({ currentOrder: null })
}), { name: 'order-storage' }));
