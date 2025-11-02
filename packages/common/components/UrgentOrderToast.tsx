import React from 'react';
import { Sale } from '@common/types';

interface UrgentOrderToastProps {
  order: Sale | null;
  onClose: () => void;
}

const UrgentOrderToast: React.FC<UrgentOrderToastProps> = ({ order, onClose }) => {
  if (!order) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 w-full max-w-sm bg-white rounded-xl shadow-2xl p-4 z-50 animate-slide-in-right">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
           <div className="p-2 bg-yellow-400 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
           </div>
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">
            New Urgent Order!
          </p>
          <p className="mt-1 text-sm text-gray-600">
            User <span className="font-semibold">{order.userId}</span> has placed an urgent order for <span className="font-semibold">₹{order.total.toFixed(2)}</span>.
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button onClick={onClose} className="inline-flex text-gray-400 hover:text-gray-500">
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UrgentOrderToast;