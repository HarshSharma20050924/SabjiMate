import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { User, Sale, PaymentStatus, UserWishlistItemDetail } from '@common/types';
import { getSalesForUser, driverMarkSaleAsPaidCash } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import { addAction } from '../offline';

const SaleCreationModal = lazy(() => import('./SaleCreationModal'));

const getStatusStyles = (status: PaymentStatus) => {
    switch(status) {
        case 'PAID_ONLINE': return 'bg-green-100 text-green-800';
        case 'PAID_CASH': return 'bg-blue-100 text-blue-800';
        case 'UNPAID': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const ConfirmationTick: React.FC = () => (
    <div className="flex items-center justify-center">
        <svg className="w-16 h-16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="#4CAF50" strokeWidth="2"/>
            <path
                className="checkmark-path"
                fill="none"
                stroke="#4CAF50"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="25"
                strokeDashoffset="25"
                d="M7 13l3 3 7-7"
                style={{ animation: 'checkmark-draw 0.5s ease-out forwards' }}
            />
        </svg>
    </div>
);

const UserActionModal: React.FC<{ user: User; userWishlist: UserWishlistItemDetail[], onClose: () => void; }> = ({ user, userWishlist, onClose }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
  
  const handlePaymentSuccess = async () => {
      setShowConfirmation(true);
      setTimeout(() => {
          setShowConfirmation(false);
          fetchUserSales();
      }, 1500);
  }

  const handleMarkPaid = async (saleId: number) => {
    setIsUpdating(saleId);

    if (!navigator.onLine) {
        try {
            await addAction({ type: 'MARK_PAID_CASH', payload: { saleId } });
            alert('Offline. Payment confirmation saved and will sync when online.');
            onClose();
        } catch(e) {
            alert('Failed to save action while offline.');
        } finally {
            setIsUpdating(null);
        }
        return;
    }

    try {
      await driverMarkSaleAsPaidCash(saleId);
      handlePaymentSuccess();
    } catch (error) {
      alert('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  const unpaidSales = sales.filter(s => s.paymentStatus === 'UNPAID');
  const totalDue = unpaidSales.reduce((acc, sale) => acc + sale.total, 0);

  if (isCreatingSale) {
    return (
        <Suspense fallback={<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><LoadingSpinner /></div>}>
            <SaleCreationModal user={user} initialItems={userWishlist} onClose={() => {
              setIsCreatingSale(false);
              fetchUserSales();
            }} />
        </Suspense>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] animate-slide-in-bottom" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
            <div>
                <h2 className="text-xl font-bold text-gray-800">Manage: {user.name}</h2>
                <p className="text-sm text-gray-500">{user.phone}</p>
            </div>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>

        <main className="p-4 md:p-6 flex-grow overflow-y-auto space-y-6">
            {/* Wishlist Section */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Today's Wishlist</h3>
                {userWishlist.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                        {userWishlist.map(item => (
                            <li key={item.vegetableName} className="flex justify-between">
                                <span className="text-gray-700">{item.vegetableName}</span>
                                <span className="font-semibold text-gray-900">{item.quantity}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-600">No items were pre-selected for today.</p>
                )}
                 <button onClick={() => setIsCreatingSale(true)} className="w-full mt-4 bg-green-600 text-white font-bold py-2 rounded-lg shadow-md hover:bg-green-700">
                    + Create / Modify Sale
                </button>
            </div>

            {/* Unpaid Bills Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-700">Unpaid Bills (Total: <span className="text-red-600 font-bold">₹{totalDue.toFixed(2)}</span>)</h3>
                {isLoading ? <LoadingSpinner/> : (
                    unpaidSales.length > 0 ? (
                        <div className="space-y-3 mt-3">
                            {unpaidSales.map(sale => (
                                 <div key={sale.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-700">
                                        {new Date(sale.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}
                                        </p>
                                        <p className="font-bold text-lg text-red-600">₹{sale.total.toFixed(2)}</p>
                                    </div>
                                    <button
                                        onClick={() => handleMarkPaid(sale.id)}
                                        disabled={isUpdating === sale.id}
                                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        {isUpdating === sale.id ? '...' : 'Confirm Cash Payment'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 p-4 mt-2">No unpaid bills for this user.</p>
                    )
                )}
            </div>

             {showConfirmation && (
                <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-20">
                    <ConfirmationTick />
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default UserActionModal;