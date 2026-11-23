import axios from 'axios';
import { useAuthStore } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token & auth credentials
      try {
        useAuthStore.getState().logout();
      } catch (e) {
        console.error('Failed to clear auth store on 401:', e);
      }

      const pathname = window.location.pathname || '';
      const isLoginRoute = pathname.includes('/login');

      if (!isLoginRoute && !isRedirecting) {
        isRedirecting = true;
        const target = pathname.startsWith('/waiter') ? '/waiter/login' : '/admin/login';
        window.location.href = target;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

