import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStatusSocket } from '../../hooks/useSocket';
import { useOrderStore } from '../../store';
import api from '../../api';
import { motion } from 'framer-motion';
import { toIST } from '../../lib/utils';
import { ArrowLeft } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'received', label: 'Order Placed', desc: 'Sent to kitchen' },
  { key: 'accepted', label: 'Chef Accepted', desc: 'Kitchen acknowledged order' },
  { key: 'preparing', label: 'Preparing', desc: 'Your food is cooking' },
  { key: 'ready', label: 'Ready to Serve', desc: 'On its way to your table!' },
  { key: 'served', label: 'Served', desc: 'Enjoy your meal!' }
];

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  useOrderStatusSocket(orderId);
  const { currentOrder } = useOrderStore();
  const [orderDetails, setOrderDetails] = useState(null);
  const [billRequested, setBillRequested] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrderDetails(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (!orderDetails) return <div className="p-8 text-center">Loading status...</div>;

  // The actual live status comes from Zustand, or fallback to fetched details
  const activeStatus = currentOrder?.status || orderDetails.kot_status || orderDetails.status;
  const activeIndex = STATUS_STEPS.findIndex(s => s.key === activeStatus);

  const handleRequestBill = async () => {
    try {
      await api.post(`/orders/${orderId}/request-bill`);
      setBillRequested(true);
      alert('Bill requested successfully! Admin will bring it to you shortly.');
    } catch (error) {
      alert('Failed to request bill.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-md flex items-center justify-between mb-2">
        <button 
          onClick={() => navigate(`/menu/${orderDetails.table_id}`)} 
          className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-2xl font-bold">Track Your Order</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>
      <p className="text-gray-500 mb-8 font-medium">Order #{orderId}</p>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-6 mb-6">
        <div className="space-y-8">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= activeIndex;
            const isActive = index === activeIndex;

            return (
              <div key={step.key} className="flex items-start gap-4 relative">
                {/* Connecting Line */}
                {index < STATUS_STEPS.length - 1 && (
                  <div className={`absolute left-[11px] top-8 w-[2px] h-[calc(100%+8px)] 
                    ${index < activeIndex ? 'bg-green-500' : 'bg-gray-200'}`} 
                  />
                )}
                
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border-2 z-10 bg-white
                  ${isCompleted ? 'border-green-500' : 'border-gray-300'}`}
                >
                  {isCompleted && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                </div>

                <div className={`${isActive ? 'opacity-100' : 'opacity-50'}`}>
                  <h3 className={`font-bold ${isActive ? 'text-green-600 text-lg' : 'text-gray-700'}`}>
                    {step.label}
                  </h3>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-6 mb-16">
        <h3 className="font-bold border-b pb-3 mb-3">Order Summary</h3>
        <div className="space-y-3">
          {orderDetails.items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.quantity} x {item.name}</span>
              <span className="font-medium">₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-4 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₹{orderDetails.total_amount}</span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => navigate(`/menu/${orderDetails.table_id}`)}
          className="w-1/3 bg-gray-100 text-black font-bold py-4 rounded-xl text-sm sm:text-base flex items-center justify-center hover:bg-gray-200 transition-colors border border-gray-200 shadow-sm"
        >
          Menu
        </button>
        <button
          onClick={handleRequestBill}
          disabled={billRequested || activeStatus !== 'served'}
          className={`flex-1 font-bold py-4 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm
            ${billRequested 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : activeStatus !== 'served'
                ? 'bg-gray-100 text-gray-400 border border-gray-200'
                : 'bg-black text-white hover:bg-gray-800 hover:shadow-md'}`}
        >
          {billRequested ? 'Bill Requested ✅' : 'Request Bill'}
        </button>
      </div>
    </div>
  );
};

export default OrderStatusPage;
