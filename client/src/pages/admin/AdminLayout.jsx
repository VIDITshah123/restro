import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { LayoutDashboard, ListOrdered, MenuSquare, Grid, BarChart3, History, LogOut, Receipt, Users, Bell } from 'lucide-react';
import { io } from 'socket.io-client';

const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq, time, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    playTone(587.33, now, 0.6); // D5
    playTone(880.00, now + 0.12, 0.8); // A5
  } catch (e) {
    console.error('Audio failed to play:', e);
  }
};

const playHelpAlarm = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const playBeep = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    
    playBeep(880.00, now, 0.15);      // A5 beep
    playBeep(880.00, now + 0.2, 0.15); // A5 beep
  } catch (e) {
    console.error('Audio failed to play:', e);
  }
};

const AdminLayout = () => {
  const { logout, email } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const [hasBillRequests, setHasBillRequests] = useState(false);
  const [helpRequests, setHelpRequests] = useState([]);
  const socketRef = useRef(null);
  const helpRequestsRef = useRef([]);

  useEffect(() => {
    helpRequestsRef.current = helpRequests;
  }, [helpRequests]);

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
      } catch (e) { }
    };

    checkRequests();
    window.addEventListener('storage', checkRequests);
    window.addEventListener('billRequestsUpdated', checkRequests);

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${SOCKET_URL}/admin`);
    socketRef.current = socket;

    socket.on('notification:bill_request', (data) => {
      try {
        const stored = localStorage.getItem('billRequestedTables');
        const reqs = stored ? new Set(JSON.parse(stored)) : new Set();
        reqs.add(data.tableId || data.tableNumber);
        localStorage.setItem('billRequestedTables', JSON.stringify([...reqs]));
        setHasBillRequests(true);
        window.dispatchEvent(new Event('billRequestsUpdated'));
        playChime();
      } catch (e) { }
    });

    socket.on('help:list', (list) => {
      if (list.length > helpRequestsRef.current.length) {
        playHelpAlarm();
      }
      setHelpRequests(list);
    });

    const intervalId = setInterval(() => {
      try {
        const stored = localStorage.getItem('billRequestedTables');
        if (stored) {
          const reqs = JSON.parse(stored);
          if (reqs.length > 0) {
            playChime();
          }
        }
      } catch (e) { }
    }, 15000);

    const helpIntervalId = setInterval(() => {
      if (helpRequestsRef.current.length > 0) {
        playHelpAlarm();
      }
    }, 5000);

    return () => {
      window.removeEventListener('storage', checkRequests);
      window.removeEventListener('billRequestsUpdated', checkRequests);
      clearInterval(intervalId);
      clearInterval(helpIntervalId);
      socket.disconnect();
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Orders', path: '/admin/orders', icon: ListOrdered },
    { name: 'Billing', path: '/admin/billing', icon: Receipt },
    { name: 'Menu', path: '/admin/menu', icon: MenuSquare },
    { name: 'Tables', path: '/admin/tables', icon: Grid },
    { name: 'Waiters', path: '/admin/waiters', icon: Users },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'KOT History', path: '/admin/kot-history', icon: History },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f0f0f] border-r border-white/5 flex flex-col">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-white/5">
          <h2 className="text-lg font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight mb-1 flex items-center justify-between">
            Byte Cafe
            {helpRequests.length > 0 && (
              <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {helpRequests.length} HELP
              </span>
            )}
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
      <main className="flex-1 overflow-hidden bg-[#0a0a0a] flex flex-col relative">
        {/* Top Header Banner */}
        <header className="bg-[#0f0f0f] border-b border-white/5 px-8 py-4 flex justify-between items-center z-40">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
            Admin Management Portal
          </div>
          <div className="flex items-center gap-4">
            {helpRequests.length > 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>{helpRequests.length} Help Request{helpRequests.length > 1 ? 's' : ''} Pending</span>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span>All Customers Assisted</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>

        {/* Floating Help Requests Alert Panel */}
        {helpRequests.length > 0 && (
          <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-80 max-h-[85vh] overflow-y-auto">
            {helpRequests.map((req) => (
              <div 
                key={req.id} 
                className="bg-[#0f0f0f]/95 border-2 border-red-500 rounded-2xl p-4 shadow-[0_0_25px_rgba(239,68,68,0.35)] backdrop-blur-xl animate-[pulse_2s_infinite] transition-all flex flex-col gap-3 relative overflow-hidden"
              >
                {/* pulsing backdrop */}
                <div className="absolute inset-0 bg-red-500/5 animate-[pulse_1.5s_infinite] pointer-events-none"></div>

                <div className="flex justify-between items-start z-10">
                  <div>
                    <h3 className="font-serif font-black text-lg text-white leading-tight flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      {req.tableNumber}
                    </h3>
                    <p className="text-red-400 text-xs font-bold uppercase tracking-widest mt-1">
                      Waiting for Assistance
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                
                <button
                  onClick={() => socketRef.current?.emit('help:resolve', { tableId: req.id })}
                  className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-black py-3 rounded-xl transition-all uppercase tracking-widest z-10 cursor-pointer shadow-[0_4px_12px_rgba(239,68,68,0.2)] hover:scale-[1.02] active:scale-95"
                >
                  Resolved
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLayout;
