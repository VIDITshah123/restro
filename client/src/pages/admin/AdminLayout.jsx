import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { LayoutDashboard, ListOrdered, MenuSquare, Grid, BarChart3, History, LogOut, Receipt, Users } from 'lucide-react';
import { io } from 'socket.io-client';

const AdminLayout = () => {
  const { logout, email } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

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
    window.addEventListener('storage', checkRequests);
    window.addEventListener('billRequestsUpdated', checkRequests);

    const socket = io('http://localhost:3000/admin');
    socket.on('notification:bill_request', (data) => {
      try {
        const stored = localStorage.getItem('billRequestedTables');
        const reqs = stored ? new Set(JSON.parse(stored)) : new Set();
        reqs.add(data.tableId || data.tableNumber);
        localStorage.setItem('billRequestedTables', JSON.stringify([...reqs]));
        setHasBillRequests(true);
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
    { name: 'Dashboard',   path: '/admin/dashboard',   icon: LayoutDashboard },
    { name: 'Orders',      path: '/admin/orders',       icon: ListOrdered },
    { name: 'Billing',     path: '/admin/billing',      icon: Receipt },
    { name: 'Menu',        path: '/admin/menu',         icon: MenuSquare },
    { name: 'Tables',      path: '/admin/tables',       icon: Grid },
    { name: 'Waiters',     path: '/admin/waiters',      icon: Users },
    { name: 'Analytics',   path: '/admin/analytics',    icon: BarChart3 },
    { name: 'KOT History', path: '/admin/kot-history',  icon: History },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f0f0f] border-r border-white/5 flex flex-col">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-white/5">
          <h2 className="text-lg font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight mb-1">
            Cafe Fillo
          </h2>
          <p className="text-xs text-gray-600 truncate font-medium">{email}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group
                  ${isActive
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.05)]'
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300 border border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'text-amber-500' : 'text-gray-600 group-hover:text-gray-400'} />
                  {item.name}
                </div>
                {item.name === 'Billing' && hasBillRequests && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400/70 hover:text-red-400 hover:bg-red-500/5 rounded-xl font-medium text-sm transition-all border border-transparent hover:border-red-500/10"
          >
            <LogOut size={18} strokeWidth={1.5} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#0a0a0a]">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
