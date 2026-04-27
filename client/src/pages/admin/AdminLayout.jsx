import { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuthStore } from '../../store';
import { LayoutDashboard, ListOrdered, MenuSquare, Grid, BarChart3, History, LogOut } from 'lucide-react';

const AdminLayout = () => {
  const { logout, email } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  useEffect(() => {
    const socket = io('http://localhost:3000/admin');
    socket.on('notification:bill_request', (data) => {
      alert(`🛎️ BILL REQUEST: Table ${data.tableNumber} is ready to pay for Order #${data.orderId}!`);
    });
    return () => socket.disconnect();
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Orders', path: '/admin/orders', icon: <ListOrdered size={20} /> },
    { name: 'Menu', path: '/admin/menu', icon: <MenuSquare size={20} /> },
    { name: 'Tables', path: '/admin/tables', icon: <Grid size={20} /> },
    { name: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={20} /> },
    { name: 'KOT History', path: '/admin/kot-history', icon: <History size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-black">Restro Admin</h2>
          <p className="text-sm text-gray-500 truncate">{email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path} 
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
