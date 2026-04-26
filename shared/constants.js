export const ORDER_STATUS = {
  PLACED: 'placed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served'
};

export const KOT_STATUS = {
  RECEIVED: 'received',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served'
};

export const SOCKET_EVENTS = {
  KOT_NEW: 'kot:new',
  KOT_STATUS_UPDATE: 'kot:statusUpdate',
  KOT_STATUS_CHANGED: 'kot:statusChanged',
  MENU_UPDATED: 'menu:updated',
  TABLE_STATUS_CHANGED: 'table:statusChanged',
  ADMIN_PEAK_ALERT: 'admin:peakAlert'
};
