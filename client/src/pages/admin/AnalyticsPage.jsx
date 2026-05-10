import { useState, useEffect } from 'react';
import api from '../../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, IndianRupee, ShoppingBag } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const exportCSV = (filename, rows) => {
    if (!rows || !rows.length) return;
    const keys = Object.keys(rows[0]);
    const csvContent = [
      keys.join(','),
      ...rows.map(row => keys.map(k => `"${row[k]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const downloadSummaryReport = () => {
    if (!data) return;
    const report = [
      { Metric: 'Total Orders', Value: data.summary.totalOrders },
      { Metric: 'Total Revenue', Value: data.summary.revenue },
      { Metric: 'Average Order Value', Value: data.summary.avgOrderValue },
      { Metric: 'Today Orders', Value: data.todaySummary.totalOrders },
      { Metric: 'Today Revenue', Value: data.todaySummary.revenue },
      { Metric: 'Gross Sales', Value: data.profitData.grossSales },
      { Metric: 'Net Profit', Value: data.profitData.netProfit },
    ];
    exportCSV('summary_report.csv', report);
  };

  const downloadDetailedReport = () => {
    if (!data) return;
    exportCSV('category_performance.csv', data.categoryPerformance);
    exportCSV('dish_performance.csv', data.topDishes.concat(data.leastDishes));
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading comprehensive analytics...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics Hub</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 border bg-white px-3 py-1 rounded-lg shadow-sm">
            <span className="text-sm font-medium text-gray-500">From</span>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-sm outline-none"
            />
            <span className="text-sm font-medium text-gray-500 ml-2">To</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-sm outline-none"
            />
          </div>
          <button onClick={downloadSummaryReport} className="flex items-center gap-2 border bg-white px-4 py-2 rounded-lg font-medium hover:bg-gray-50">
            <Download size={18} /> Summary Report
          </button>
          <button onClick={downloadDetailedReport} className="flex items-center gap-2 border bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900">
            <Download size={18} /> Detailed Report
          </button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-gray-500 font-medium mb-1 flex items-center gap-2"><IndianRupee size={18}/> Selected Period Revenue</p>
          <h3 className="text-3xl font-black">₹{data.todaySummary.revenue}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-gray-500 font-medium mb-1 flex items-center gap-2"><ShoppingBag size={18}/> Selected Period Orders</p>
          <h3 className="text-3xl font-black">{data.todaySummary.totalOrders}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-gray-500 font-medium mb-1 flex items-center gap-2"><TrendingUp size={18}/> Net Profit</p>
          <h3 className="text-3xl font-black text-green-600">₹{data.profitData.netProfit}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-gray-500 font-medium mb-1">Avg Order Value</p>
          <h3 className="text-3xl font-black">₹{data.summary.avgOrderValue}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Top Dishes */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold mb-4">Top 5 Performing Dishes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topDishes}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_sold" fill="#000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold mb-4">Category Wise Sales (₹)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryPerformance} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#4ade80" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Least Performing Dishes */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold mb-4">Least 5 Performing Dishes</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-sm text-gray-500">
                <th className="pb-2">Dish</th>
                <th className="pb-2">Sold</th>
                <th className="pb-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.leastDishes.map((dish, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 font-medium">{dish.name}</td>
                  <td className="py-3">{dish.total_sold}</td>
                  <td className="py-3 text-red-500 font-medium">₹{dish.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold mb-4">Revenue by Payment Method</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.paymentBreakdown} dataKey="revenue" nameKey="payment_method" cx="50%" cy="50%" outerRadius={80} label>
                  {data.paymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
