import React, { useState, useEffect, useCallback } from 'react';
import { User, Sale, PaymentStatus, UserWishlistItemDetail } from '@common/types';
import { getSalesForUser, driverMarkSaleAsPaidCash } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import SaleCreationModal from './SaleCreationModal';
import { addAction } from '../offline';

const getStatusStyles = (status: PaymentStatus) => {
    switch(status) {
        case 'PAID_ONLINE': return 'bg-green-100 text-green-800';
        case 'PAID_CASH': return 'bg-blue-100 text-blue-800';
        case 'UNPAID': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

interface UserActionModalProps {
  user: User;
  wishlist: UserWishlistItemDetail[];
  onClose: () => void;
}

const UserActionModal: React.FC<UserActionModalProps> = ({ user, wishlist, onClose }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [isCreatingSale, setIsCreatingSale] = useState(false);

  const fetchUserSales = useCallback(async () => {
    try {
      setIsLoading(true);
      const salesData = await getSalesForUser(user.phone);
      setSales(salesData);
    } catch (error) {
      console.error("Failed to fetch user sales", error);
    } finally {
      setIsLoading(false);
    }
  }, [user.phone]);

  useEffect(() => {
    fetchUserSales();
  }, [fetchUserSales]);

  const handleMarkPaid = async (saleId: number) => {
    setIsUpdating(saleId);

    if (!navigator.onLine) {
        try {
            await addAction({ type: 'MARK_PAID_CASH', payload: { saleId } });
            alert('You are offline. The payment confirmation has been saved and will sync automatically when you are back online.');
            onClose();
        } catch(e) {
            alert('Failed to save action while offline. Please try again.');
        } finally {
            setIsUpdating(null);
        }
        return;
    }

    try {
      await driverMarkSaleAsPaidCash(saleId);
      await fetchUserSales();
    } catch (error) {
      alert('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  const unpaidSales = sales.filter(s => s.paymentStatus === 'UNPAID');
  const totalDue = unpaidSales.reduce((acc, sale) => acc + sale.total, 0);

  if (isCreatingSale) {
    return <SaleCreationModal user={user} wishlist={wishlist} onClose={() => {
      setIsCreatingSale(false);
      fetchUserSales();
    }} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Manage: {user.name}</h2>
                <p className="text-sm text-gray-500">{user.phone}</p>
            </div>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
        </header>

        <main className="p-6 flex-grow overflow-y-auto max-h-[60vh] space-y-4">
            <button onClick={() => setIsCreatingSale(true)} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-green-700">
                + Create New Sale
            </button>

            <h3 className="text-lg font-semibold text-gray-700 border-t pt-4">Unpaid Bills (Total: ₹{totalDue.toFixed(2)})</h3>
            {isLoading ? <LoadingSpinner/> : (
                unpaidSales.length > 0 ? (
                    <div className="space-y-3">
                        {unpaidSales.map(sale => (
                             <div key={sale.id} className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold text-gray-700">
                                    {new Date(sale.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}
                                    </p>
                                    <p className="font-bold text-lg text-red-600">₹{sale.total.toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={() => handleMarkPaid(sale.id)}
                                    disabled={isUpdating === sale.id}
                                    className="w-full bg-blue-600 text-white text-sm font-bold py-2 px-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {isUpdating === sale.id ? 'Confirming...' : 'Confirm Cash Payment'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 p-4">No unpaid bills for this user.</p>
                )
            )}
        </main>
        
        <footer className="bg-gray-100 p-4 rounded-b-lg border-t text-right">
            <button onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-400">Close</button>
        </footer>
      </div>
    </div>
  );
};

export default UserActionModal;
