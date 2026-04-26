import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useOrderStore } from '../store';

const SOCKET_URL = 'http://localhost:3000';

export const useKOTSocket = (onNewKOT, onStatusUpdate) => {
  const socketRef = useRef(null);
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    socketRef.current = io(`${SOCKET_URL}/kitchen`, {
      auth: { token }
    });

    socketRef.current.on('kot:new', (kot) => {
      if (onNewKOT) onNewKOT(kot);
    });

    socketRef.current.on('kot:statusUpdate', (update) => {
      if (onStatusUpdate) onStatusUpdate(update);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token, onNewKOT, onStatusUpdate]);

  const updateStatus = (kotId, status) => {
    // We emit via REST in this implementation, but can use socket too
  };

  return { updateStatus };
};

export const useOrderStatusSocket = (orderId) => {
  const socketRef = useRef(null);
  const updateOrderStatus = useOrderStore(s => s.updateOrderStatus);

  useEffect(() => {
    if (!orderId) return;

    socketRef.current = io(`${SOCKET_URL}/customer`);
    socketRef.current.emit('join:order', { orderId });

    socketRef.current.on('kot:statusUpdate', ({ newStatus }) => {
      updateOrderStatus(newStatus);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [orderId, updateOrderStatus]);
};
