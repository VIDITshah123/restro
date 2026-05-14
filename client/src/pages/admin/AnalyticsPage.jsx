import { useState, useEffect } from 'react';
import api from '../../api';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { Download, TrendingUp, IndianRupee, ShoppingBag, Percent } from 'lucide-react';

const COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6'];

const darkTooltip = {
  contentStyle: { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' },
  labelStyle: { color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' },
  cursor: { fill: 'rgba(255,255,255,0.03)' }
};

const KpiCard = ({ label, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6 relative overflow-hidden"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">{label}</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon size={16} style={{ color }} strokeWidth={1.5} />
      </div>
    </div>
    <h3 className="text-3xl font-black text-gray-100 tracking-tight">{value}</h3>
  </motion.div>
);

const SectionCard = ({ title, children, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6"
  >
    <h3 className="text-sm font-serif font-bold text-gray-400 uppercase tracking-widest mb-5">{title}</h3>
    {children}
  </motion.div>
);

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let url = '/analytics/comprehensive';
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await api.get(url);
      setData(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnalytics(); }, [dateRange]);

  const exportCSV = (filename, rows) => {
    if (!rows || !rows.length) return;
    const keys = Object.keys(rows[0]);
    const csvContent = [keys.join(','), ...rows.map(row => keys.map(k => `"${row[k]}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
    link.download = filename;
    link.click();
  };

  const downloadSummaryReport = () => {
    if (!data) return;
    exportCSV('summary_report.csv', [
      { Metric: 'Total Orders', Value: data.summary.totalOrders },
      { Metric: 'Total Revenue', Value: data.summary.revenue },
      { Metric: 'Average Order Value', Value: data.summary.avgOrderValue },
      { Metric: 'Today Orders', Value: data.todaySummary.totalOrders },
      { Metric: 'Today Revenue', Value: data.todaySummary.revenue },
      { Metric: 'Gross Sales', Value: data.profitData.grossSales },
      { Metric: 'Net Profit', Value: data.profitData.netProfit },
    ]);
  };

  const downloadDetailedReport = () => {
    if (!data) return;
    exportCSV('category_performance.csv', data.categoryPerformance);
    exportCSV('dish_performance.csv', data.topDishes.concat(data.leastDishes));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-600">
      <p className="text-sm uppercase tracking-widest animate-pulse">Loading analytics…</p>
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-red-400">
      <p className="text-sm">Failed to load analytics</p>
    </div>
  );

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">Reports & Performance Hub</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range */}
          {/*
          <div className="flex items-center gap-2 bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5">
            <span className="text-xs text-gray-500 uppercase tracking-wider">From</span>
            <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="text-sm bg-transparent text-gray-300 outline-none" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">To</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="text-sm bg-transparent text-gray-300 outline-none" />
          </div>
          */}
          <button onClick={downloadSummaryReport} className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 px-4 py-2.5 rounded-xl font-medium text-sm transition-all">
            <Download size={15} /> Summary
          </button>
          <button onClick={downloadDetailedReport} className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold px-4 py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all uppercase tracking-wider">
            <Download size={15} /> Detailed
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Revenue"     value={`₹${data.summary.revenue}`}             icon={IndianRupee} color="#f59e0b" delay={0}   />
        <KpiCard label="Total Orders"      value={data.summary.totalOrders}               icon={ShoppingBag} color="#8b5cf6" delay={0.1} />
        <KpiCard label="Net Profit"        value={`₹${data.profitData.netProfit}`}        icon={TrendingUp}  color="#10b981" delay={0.2} />
        <KpiCard label="Avg Order Value"   value={`₹${data.summary.avgOrderValue}`}       icon={Percent}     color="#3b82f6" delay={0.3} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <SectionCard title="Top 5 Dishes by Volume" delay={0.4}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topDishes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} />
                <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                <Tooltip {...darkTooltip} />
                <Bar dataKey="total_sold" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Category Revenue (₹)" delay={0.45}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryPerformance}
                  dataKey="revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {data.categoryPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...darkTooltip} formatter={(value) => `₹${value}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Least Performing Dishes" delay={0.5}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-3 text-xs text-gray-600 uppercase tracking-wider">Dish</th>
                <th className="pb-3 text-xs text-gray-600 uppercase tracking-wider">Sold</th>
                <th className="pb-3 text-xs text-gray-600 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.leastDishes.map((dish, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  <td className="py-3 text-sm font-medium text-gray-300">{dish.name}</td>
                  <td className="py-3 text-sm text-gray-500">{dish.total_sold}</td>
                  <td className="py-3 text-sm font-black text-red-400">₹{dish.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Revenue by Payment Method" delay={0.55}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.paymentBreakdown} dataKey="revenue" nameKey="payment_method" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: 'rgba(255,255,255,0.1)' }}>
                  {data.paymentBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ color: '#f59e0b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default AnalyticsPage;
