import React from 'react';
import { toISTFull } from '../../lib/utils';

const ThermalReceipt = ({ tableNumber, orders = [], grandTotal = 0, paymentMethod = 'Cash', waiterName }) => {
  if (!orders || orders.length === 0) return null;

  // Group items by name and variant so they are shown consolidated, which is standard for thermal receipts!
  const consolidatedItems = {};
  orders.forEach(order => {
    order.items?.forEach(item => {
      const key = `${item.name}-${item.special_notes || ''}`;
      if (consolidatedItems[key]) {
        consolidatedItems[key].quantity += item.quantity;
      } else {
        consolidatedItems[key] = {
          name: item.name,
          special_notes: item.special_notes,
          price: item.price,
          quantity: item.quantity,
          is_veg: item.is_veg
        };
      }
    });
  });

  const itemsList = Object.values(consolidatedItems);
  const subtotal = itemsList.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cgst = parseFloat((subtotal * 0.025).toFixed(2)); // 2.5% CGST
  const sgst = parseFloat((subtotal * 0.025).toFixed(2)); // 2.5% SGST
  const serviceCharge = subtotal > 0 ? 10.00 : 0.00;
  const calculatedGrandTotal = subtotal + cgst + sgst + serviceCharge;

  const receiptDate = orders[0]?.placed_at ? toISTFull(orders[0].placed_at) : toISTFull(new Date().toISOString());

  // Simple clean mock QR code SVG (simulated feedback/website QR)
  const mockQrCode = (
    <svg className="w-20 h-20 mx-auto opacity-80 text-black" viewBox="0 0 100 100" fill="currentColor">
      <path d="M0 0h30v30H0zm10 10h10v10H10zm60-10h30v30H70zm10 10h10v10H80zM0 70h30v30H0zm10 10h10v10H10zm60 10V70h10v10h10v10zm20-20h10v10H90zm-10-10H70v10h10zm0 10h10v10H80z" />
      <path d="M35 5h10v10H35zm0 20h10v10H35zm20-20h10v10H55zm0 20h10v10H55zM5 35h10v10H5zm20 0h10v10H25zm20 0h10v10H45zm20 0h10v10H65zm20 0h10v10H85zm-80 20h10v10H5zm20 0h10v10H25zm20 0h10v10H45zm20 0h10v10H65zm20 0h10v10H85z" />
    </svg>
  );

  return (
    <div id="print-receipt-area" className="font-mono text-black bg-white p-6 max-w-[80mm] mx-auto text-xs leading-normal">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold tracking-wider uppercase">Yummy Bites</h1>
        <p className="text-[10px] text-gray-700">123 Gourmet Boulevard, Tech City</p>
        <p className="text-[10px] text-gray-700">Tel: +91 98765 43210 | GSTIN: 27AAAAA1111A1Z1</p>
        <p className="my-2 border-b border-dashed border-black"></p>
        <h2 className="text-sm font-bold tracking-tight">TAX INVOICE</h2>
      </div>

      {/* Meta Info */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between">
          <span>Table:</span>
          <span className="font-bold">{tableNumber || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{receiptDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Bill No:</span>
          <span>INV-{orders.map(o => o.id).join('-')}</span>
        </div>
        {waiterName && (
          <div className="flex justify-between">
            <span>Server:</span>
            <span>{waiterName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Payment:</span>
          <span className="font-bold uppercase">{paymentMethod}</span>
        </div>
      </div>

      <p className="my-2 border-b border-dashed border-black"></p>

      {/* Items Table */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between font-bold">
          <span className="w-1/2">Item Description</span>
          <span className="w-1/6 text-center">Qty</span>
          <span className="w-1/3 text-right">Amount</span>
        </div>
        <p className="border-b border-dotted border-black/40 my-1"></p>
        {itemsList.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex justify-between">
              <span className="w-1/2 truncate">{item.name}</span>
              <span className="w-1/6 text-center text-gray-800">x{item.quantity}</span>
              <span className="w-1/3 text-right">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
            {item.special_notes && (
              <div className="text-[9px] text-gray-700 italic pl-2">
                * {item.special_notes}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="my-2 border-b border-dashed border-black"></p>

      {/* Totals */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-700">
          <span>CGST (2.5%):</span>
          <span>₹{cgst.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-700">
          <span>SGST (2.5%):</span>
          <span>₹{sgst.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-700">
          <span>Service Charge:</span>
          <span>₹{serviceCharge.toFixed(2)}</span>
        </div>
        <p className="border-b border-dotted border-black/40 my-1"></p>
        <div className="flex justify-between font-bold text-sm">
          <span>GRAND TOTAL:</span>
          <span>₹{calculatedGrandTotal.toFixed(2)}</span>
        </div>
      </div>

      <p className="my-2 border-b border-dashed border-black"></p>

      {/* Footer / QR */}
      <div className="text-center space-y-2 mt-4">
        <p className="font-bold">Thank you for dining with us!</p>
        <p className="text-[9px] text-gray-700">Scan QR to share your experience</p>
        <div className="my-2 flex justify-center">
          {mockQrCode}
        </div>
        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Powered by Yummy Bites</p>
      </div>
    </div>
  );
};

export default ThermalReceipt;
