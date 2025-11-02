import React, { useState } from 'react';
import { UserWithBill, Sale, PaymentStatus } from '@common/types';
import { markSaleAsPaidCash } from '@common/api';

interface UserSalesModalProps {
  user: UserWithBill;
  sales: Sale[];
  onClose: () => void;
}

const getStatusStyles = (status: PaymentStatus) => {
    switch(status) {
        case 'PAID_ONLINE':
            return 'bg-green-100 text-green-800';
        case 'PAID_CASH':
            return 'bg-blue-100 text-blue-800';
        case 'UNPAID':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

const UserSalesModal: React.FC<UserSalesModalProps> = ({ user, sales, onClose }) => {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const handleMarkAsPaid = async (saleId: number) => {
      setIsUpdating(saleId);
      try {
          await markSaleAsPaidCash(saleId);
          // The parent will refetch on close, so no need to manage state here.
          // For immediate feedback, we could update local state, but refetching is more robust.
      } catch (error) {
          console.error("Failed to mark as paid", error);
          alert("Could not update sale status.");
      } finally {
          setIsUpdating(null);
          onClose(); // Close and trigger refetch
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">{user.name}'s Details</h2>
                <p className="text-sm text-gray-500">{user.phone}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
           <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="font-semibold text-gray-500">Address</p>
                    <p className="text-gray-800">{user.address || 'Not provided'}</p>
                </div>
                <div>
                    <p className="font-semibold text-gray-500">Location</p>
                    <p className="text-gray-800">{user.city || 'N/A'}, {user.state || 'N/A'}</p>
                </div>
                <div>
                    <p className="font-semibold text-gray-500">Payment Preference</p>
                    <p className="text-gray-800 font-semibold capitalize">{user.paymentPreference?.toLowerCase() || 'Not set'}</p>
                </div>
            </div>
        </div>
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Sales History</h3>
          {sales.length > 0 ? (
            <div className="space-y-4">
              {sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale) => (
                <div key={sale.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold text-gray-700">
                      {new Date(sale.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusStyles(sale.paymentStatus)}`}>
                        {sale.paymentStatus.replace('_', ' ').toLowerCase()}
                    </span>
                  </div>
                  <ul className="border-t pt-2">
                    {sale.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex justify-between text-sm text-gray-600">
                        <span>{item.vegetableName} ({item.quantity})</span>
                        <span>₹{item.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between items-center mt-2 border-t pt-2">
                     <p className="font-bold text-lg text-gray-800">Total: ₹{sale.total.toFixed(2)}</p>
                     {sale.paymentStatus === 'UNPAID' && (
                         <button 
                            onClick={() => handleMarkAsPaid(sale.id)}
                            disabled={isUpdating === sale.id}
                            className="bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        >
                             {isUpdating === sale.id ? 'Updating...' : 'Mark Paid (Cash)'}
                         </button>
                     )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">This user has no sales history.</p>
          )}
        </div>
         <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

export default UserSalesModal;