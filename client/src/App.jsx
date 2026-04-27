import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';

import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import OrderStatusPage from './pages/customer/OrderStatusPage';

import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import OrdersPage from './pages/admin/OrdersPage';
import MenuManagementPage from './pages/admin/MenuManagementPage';
import TablesPage from './pages/admin/TablesPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';

import KOTBoard from './pages/kitchen/KOTBoard';
import KOTHistory from './pages/kitchen/KOTHistory';

import WaiterDashboard from './pages/waiter/WaiterDashboard';

const ProtectedRoute = ({ children, roles }) => {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/admin/login" />;
  if (roles && !roles.includes(role)) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Customer Portal */}
        <Route path="/menu/:tableId" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order-status/:orderId" element={<OrderStatusPage />} />

        {/* Admin Portal */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin', 'manager']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="menu" element={<MenuManagementPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="kot-history" element={<KOTHistory />} />
        </Route>

        {/* Kitchen Portal */}
        <Route path="/kitchen" element={
          <ProtectedRoute roles={['admin', 'kitchen']}>
            <KOTBoard />
          </ProtectedRoute>
        } />
        <Route path="/kitchen/history" element={
          <ProtectedRoute roles={['admin', 'kitchen']}>
            <KOTHistory />
          </ProtectedRoute>
        } />
        
        {/* Waiter Portal */}
        <Route path="/waiter" element={<WaiterDashboard />} />
        
        <Route path="/" element={<Navigate to="/menu/1" />} />
      </Routes>
    </Router>
  );
}

export default App;
