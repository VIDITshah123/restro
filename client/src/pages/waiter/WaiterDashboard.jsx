import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../api';
import { useAuthStore } from '../../store';

const WaiterDashboard = () => {
  const [tables, setTables] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]); // orders ready to serve
  const { token, name, logout } = useAuthStore();
  const navigate = useNavigate();

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTables();

    // Connect to waiter socket namespace for notifications
    const socket = io('http://localhost:3000/waiter');

    socket.on('order:ready', (data) => {
      setReadyOrders(prev => {
        if (prev.find(o => o.kotId === data.kotId)) return prev;
        return [...prev, data];
      });
      // browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🍽️ Order Ready!`, { body: `${data.tableNumber} order is ready to serve!` });
      }
    });

    socket.on('kot:statusUpdate', (update) => {
      if (update.newStatus === 'served') {
        setReadyOrders(prev => prev.filter(o => o.kotId !== update.kotId));
      }
    });

    return () => socket.disconnect();
  }, []);

  const markServed = async (kotId, orderId) => {
    try {
      await api.patch(`/kot/${kotId}/status`, { status: 'served' });
      setReadyOrders(prev => prev.filter(o => o.kotId !== kotId));
      fetchTables();
    } catch (err) {
      alert('Error marking as served');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/waiter/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div>
          <h1 className="text-xl font-black">Waiter Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome, {name}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-red-500 font-medium border border-red-200 px-3 py-1.5 rounded-lg">
          Logout
        </button>
      </header>

      <div className="p-6 space-y-8">
        {/* Ready Orders Alert */}
        {readyOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3 text-green-700">🟢 Orders Ready to Serve ({readyOrders.length})</h2>
            <div className="space-y-3">
              {readyOrders.map(order => (
                <div key={order.kotId} className="bg-green-50 border-2 border-green-400 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{order.tableNumber}</p>
                    <p className="text-green-700 text-sm">Order #{order.orderId} is ready!</p>
                  </div>
                  <button
                    onClick={() => markServed(order.kotId, order.orderId)}
                    className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg"
                  >
                    Mark Served ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tables Grid */}
        <div>
          <h2 className="text-lg font-bold mb-4">All Tables</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tables.map(table => (
              <button
                key={table.id}
                onClick={() => navigate(`/menu/${table.id}`)}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  table.is_occupied
                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                    : 'bg-white border-gray-200 hover:border-black hover:shadow-md'
                }`}
              >
                <h2 className="text-2xl font-black mb-1">{table.table_number}</h2>
                <span className="text-sm font-bold uppercase tracking-wider">
                  {table.is_occupied ? '🔴 Occupied' : '🟢 Free'}
                </span>
                {!table.is_occupied && (
                  <p className="text-xs text-gray-400 mt-1">Tap to order</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaiterDashboard;
