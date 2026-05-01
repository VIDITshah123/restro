import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { LayoutDashboard, ListOrdered, MenuSquare, Grid, BarChart3, History, LogOut, Receipt, Users } from 'lucide-react';
import { io } from 'socket.io-client';

const AdminLayout = () => {
  const { logout, email } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const [hasBillRequests, setHasBillRequests] = useState(false);

  useEffect(() => {
    const checkRequests = () => {
      try {
        const stored = localStorage.getItem('billRequestedTables');
        if (stored) {
          const reqs = JSON.parse(stored);
          setHasBillRequests(reqs.length > 0);
        } else {
          setHasBillRequests(false);
        }
      } catch (e) {}
    };

    checkRequests();
    
    // Listen to localStorage changes (from BillingPage or other tabs)
    window.addEventListener('storage', checkRequests);
    // Custom event to sync within the same window
    window.addEventListener('billRequestsUpdated', checkRequests);

    const socket = io('http://localhost:3000/admin');
    socket.on('notification:bill_request', (data) => {
      try {
        const stored = localStorage.getItem('billRequestedTables');
        const reqs = stored ? new Set(JSON.parse(stored)) : new Set();
        reqs.add(data.tableId || data.tableNumber);
        localStorage.setItem('billRequestedTables', JSON.stringify([...reqs]));
        setHasBillRequests(true);
        // Also dispatch event for other components in same window
        window.dispatchEvent(new Event('billRequestsUpdated'));
      } catch (e) {}
    });

    return () => {
      window.removeEventListener('storage', checkRequests);
      window.removeEventListener('billRequestsUpdated', checkRequests);
      socket.disconnect();
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Orders', path: '/admin/orders', icon: <ListOrdered size={20} /> },
    { name: 'Billing', path: '/admin/billing', icon: <Receipt size={20} /> },
    { name: 'Menu', path: '/admin/menu', icon: <MenuSquare size={20} /> },
    { name: 'Tables', path: '/admin/tables', icon: <Grid size={20} /> },
    { name: 'Waiters', path: '/admin/waiters', icon: <Users size={20} /> },
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
              className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              <div className="flex items-center gap-3">
                {item.icon}
                {item.name}
              </div>
              {item.name === 'Billing' && hasBillRequests && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
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
