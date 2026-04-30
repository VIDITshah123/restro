import { useState, useEffect } from 'react';
import api from '../../api';
import { toIST } from '../../lib/utils';

const KOTHistory = () => {
  const [kots, setKots] = useState([]);

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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-gray-800">KOT History</h1>
        <a href="/kitchen" className="text-blue-500 underline font-bold">Back to KDS</a>
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
            {kots.map(kot => (
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
                  {toIST(kot.generated_at)}
                </td>
              </tr>
            ))}
            {kots.length === 0 && (
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
