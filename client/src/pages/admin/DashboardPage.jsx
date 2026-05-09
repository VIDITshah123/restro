import { useState, useEffect } from 'react';
import api from '../../api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState({ totalOrders: 0, revenue: 0, avgOrderValue: 0 });
  const [peakHours, setPeakHours] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const statsRes = await api.get('/analytics/comprehensive');
        const todayData = statsRes.data.data.todaySummary;
        setStats({
          totalOrders: todayData.totalOrders,
          revenue: todayData.revenue,
          avgOrderValue: todayData.totalOrders > 0 ? (todayData.revenue / todayData.totalOrders).toFixed(2) : 0
        });

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
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Predicted Peak Hours (Today)</h3>
          <span className="text-sm px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">✨ AI Forecast</span>
        </div>
        <div className="h-72">
          {peakHours.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={peakHours.map((vol, hour) => ({
                  time: `${String(hour).padStart(2, '0')}:00`,
                  Orders: parseFloat(vol.toFixed(1))
                }))} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="Orders" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">Loading AI Forecast...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
