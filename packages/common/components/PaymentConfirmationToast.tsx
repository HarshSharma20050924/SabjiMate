import React from 'react';

interface OnlinePaymentData {
  customerName: string;
  amount: number;
}
interface CashPaymentData {
  driverName: string;
  customerName: string;
  sale: { total: number };
}

interface PaymentConfirmationToastProps {
  data: OnlinePaymentData | CashPaymentData | null;
  onClose: () => void;
}

const PaymentConfirmationToast: React.FC<PaymentConfirmationToastProps> = ({ data, onClose }) => {
  if (!data) {
    return null;
  }

  const isOnlinePayment = 'amount' in data;

  return (
    <div className="fixed top-20 right-4 w-full max-w-sm bg-white rounded-xl shadow-2xl p-4 z-50 animate-slide-in-right">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
           <div className="p-2 bg-green-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
           </div>
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">
             {isOnlinePayment ? 'Online Payment Received' : 'Cash Payment Received'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
             {isOnlinePayment
                ? <><span className="font-semibold">{data.customerName}</span> paid <span className="font-semibold">₹{(data as OnlinePaymentData).amount.toFixed(2)}</span> online.</>
                : <><span className="font-semibold">{(data as CashPaymentData).driverName}</span> collected <span className="font-semibold">₹{(data as CashPaymentData).sale.total.toFixed(2)}</span> from <span className="font-semibold">{data.customerName}</span>.</>
              }
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

export default PaymentConfirmationToast;