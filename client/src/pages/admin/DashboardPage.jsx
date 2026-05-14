import { useState, useEffect } from 'react';
import api from '../../api';
import { motion } from 'framer-motion';
import { IndianRupee, ShoppingBag, TrendingUp, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const StatCard = ({ label, value, prefix, icon: Icon, delay, glowColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6 relative overflow-hidden"
    style={{ boxShadow: `0 0 40px ${glowColor}` }}
  >
    <div className="absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(ellipse at top left, ${glowColor} 0%, transparent 60%)` }} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon size={18} className="text-amber-500" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-100 tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
    </div>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-xs text-amber-500 font-bold mb-1 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-black text-gray-100">{payload[0].value} orders</p>
      </div>
    );
  }
  return null;
};

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
          avgOrderValue: todayData.totalOrders > 0 ? parseFloat((todayData.revenue / todayData.totalOrders).toFixed(2)) : 0
        });

        const peakRes = await api.get('/ai/peak-hours');
        setPeakHours(peakRes.data.hourlyVolume);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, []);

  const chartData = peakHours.map((vol, hour) => ({
    time: `${String(hour).padStart(2, '0')}:00`,
    Orders: parseFloat(vol.toFixed(1))
  }));

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
          Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1 font-medium uppercase tracking-widest">Today's overview</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard label="Total Revenue"       value={stats.revenue}       prefix="₹" icon={IndianRupee} delay={0}    glowColor="rgba(251,191,36,0.04)" />
        <StatCard label="Total Orders"        value={stats.totalOrders}   prefix=""  icon={ShoppingBag}  delay={0.1}  glowColor="rgba(139,92,246,0.04)" />
        <StatCard label="Avg. Order Value"    value={stats.avgOrderValue} prefix="₹" icon={TrendingUp}   delay={0.2}  glowColor="rgba(34,197,94,0.04)" />
      </div>

      {/* Peak Hours Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-serif font-black text-gray-100 tracking-wide">Predicted Peak Hours</h3>
            <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-widest">AI-powered forecast</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full font-bold uppercase tracking-wider">
            <Sparkles size={12} />
            AI Forecast
          </span>
        </div>
        <div className="h-72">
          {peakHours.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(251,191,36,0.2)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="Orders" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOrders)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Sparkles size={32} className="text-amber-500/30 mx-auto mb-3" />
                <p className="text-gray-600 text-sm uppercase tracking-widest">Loading AI Forecast…</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
