import { useState, useEffect } from 'react';
import api from '../../api';

const DashboardPage = () => {
  const [stats, setStats] = useState({ totalOrders: 0, revenue: 0, avgOrderValue: 0 });
  const [peakHours, setPeakHours] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const statsRes = await api.get('/analytics/today');
        setStats(statsRes.data.data);

        const peakRes = await api.get('/ai/peak-hours');
        setPeakHours(peakRes.data.hourlyVolume);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-gray-500 font-medium">Today's Revenue</h3>
          <p className="text-3xl font-bold mt-2">₹{stats.revenue}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-gray-500 font-medium">Total Orders</h3>
          <p className="text-3xl font-bold mt-2">{stats.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-gray-500 font-medium">Average Order Value</h3>
          <p className="text-3xl font-bold mt-2">₹{stats.avgOrderValue}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-bold mb-4">Predicted Peak Hours (Today)</h3>
        <div className="h-64 flex items-end gap-2">
          {peakHours.map((vol, hour) => {
            const maxVol = Math.max(...peakHours, 1);
            const height = `${(vol / maxVol) * 100}%`;
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-blue-500 rounded-t-sm transition-all"
                  style={{ height, minHeight: vol > 0 ? '4px' : '0' }}
                  title={`${vol} orders predicted`}
                ></div>
                <span className="text-xs text-gray-500">{hour}h</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
