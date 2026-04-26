import { useState, useEffect } from 'react';
import api from '../../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AnalyticsPage = () => {
  const [topDishes, setTopDishes] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const topRes = await api.get('/analytics/top-dishes');
        setTopDishes(topRes.data.data.map(d => ({ name: d.name, total: d.total_sold })));
      } catch (err) {
        console.error(err);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-bold mb-4">Top 5 Dishes</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDishes}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
