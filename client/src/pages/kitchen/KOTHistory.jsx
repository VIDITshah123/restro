import { useState, useEffect } from 'react';
import api from '../../api';
import { toIST, toISTFull } from '../../lib/utils';

const KOTHistory = () => {
  const [kots, setKots] = useState([]);
  const [sortOption, setSortOption] = useState('Newest First');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/kot/history');
        setKots(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, []);

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear ALL KOT history? This cannot be undone.')) return;
    try {
      await api.delete('/kot/history/clear');
      const res = await api.get('/kot/history');
      setKots(res.data.data);
      alert('KOT history cleared!');
    } catch (err) {
      alert('Error clearing history');
    }
  };

  const sortedKots = [...kots].sort((a, b) => {
    if (sortOption === 'Newest First') return new Date(b.generated_at) - new Date(a.generated_at);
    if (sortOption === 'Oldest First') return new Date(a.generated_at) - new Date(b.generated_at);
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-gray-800">KOT History</h1>
        <div className="flex items-center gap-4">
          <select 
            value={sortOption} 
            onChange={e => setSortOption(e.target.value)}
            className="border p-2 rounded-lg text-sm"
          >
            <option>Newest First</option>
            <option>Oldest First</option>
          </select>
          <button 
            onClick={clearHistory}
            className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium hover:bg-red-100 text-sm"
          >
            Clear History
          </button>
          <a href="/kitchen" className="text-blue-500 underline font-bold ml-2">Back to KDS</a>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">KOT Number</th>
              <th className="p-4">Table</th>
              <th className="p-4">Items</th>
              <th className="p-4">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedKots.map(kot => (
              <tr key={kot.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">{kot.kot_number}</td>
                <td className="p-4">{kot.table_number}</td>
                <td className="p-4">
                  <div className="text-sm text-gray-600">
                    {kot.items.map((item, idx) => (
                      <span key={idx}>
                        {item.quantity}x {item.name}
                        {item.special_notes && item.special_notes.trim() !== '' ? ` (${item.special_notes})` : ''}
                        {idx < kot.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {toISTFull(kot.generated_at)}
                </td>
              </tr>
            ))}
            {sortedKots.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">No history available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KOTHistory;
