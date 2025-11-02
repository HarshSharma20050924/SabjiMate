import React, { useMemo } from 'react';
import { Language, OrderItem, Vegetable } from '@common/types';
import { translations } from '@common/constants';
import { calculateItemPrice } from '@common/utils';
import { useStore, AppState } from '@client/store';

interface MyListScreenProps {
  language: Language;
  onConfirmSuccess: () => void;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const WishlistLockBanner: React.FC = () => (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-4 rounded-md" role="alert">
      <div className="flex">
        <div className="py-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
        <div className="ml-3">
          <p className="font-bold">Today's list is now locked.</p>
          <p className="text-sm">Your selections are final for today's delivery planning.</p>
        </div>
      </div>
    </div>
);

const MyListScreen: React.FC<MyListScreenProps> = ({
  language,
  onConfirmSuccess,
}) => {
  const t = translations[language];

  const wishlist = useStore((state: AppState) => state.wishlist);
  const vegetables = useStore((state: AppState) => state.vegetables);
  const isWishlistLocked = useStore((state: AppState) => state.isWishlistLocked);
  const removeItemFromWishlist = useStore((state: AppState) => state.removeItemFromWishlist);
  const confirmWishlist = useStore((state: AppState) => state.confirmWishlist);

  const onConfirm = async () => {
    try {
        await confirmWishlist();
        onConfirmSuccess();
    } catch (err: any) {
        alert(err.message);
    }
  };

  const detailedWishlist = useMemo(() => {
    return wishlist.map(item => {
      const vegetable = vegetables.find(v => v.id === item.id);
      if (!vegetable) return null;
      return {
        ...item,
        vegetable,
        calculatedPrice: calculateItemPrice(vegetable.price, item.quantity),
      };
    }).filter(Boolean) as (OrderItem & { vegetable: Vegetable; calculatedPrice: number | null })[];
  }, [wishlist, vegetables]);
  
  const totalPrice = useMemo(() => {
      return detailedWishlist.reduce((total, item) => total + (item.calculatedPrice || 0), 0);
  }, [detailedWishlist]);

  return (
    <div style={{ height: 'calc(100vh - 128px)' }} className="flex flex-col bg-gray-50">
        <header className="p-4 bg-white border-b flex-shrink-0 z-10">
            <h2 className="text-2xl font-bold text-gray-800">Your Selection for Today</h2>
            <p className="text-gray-600">Review your items before confirming.</p>
        </header>
        
        <main className="flex-grow overflow-y-auto p-4">
            {isWishlistLocked && <WishlistLockBanner />}
            {detailedWishlist.length > 0 ? (
                <ul className="space-y-3">
                    {detailedWishlist.map(item => (
                        <li key={item.id} className="flex items-center space-x-4 bg-white p-3 rounded-lg shadow-sm animate-slide-in-up-subtle">
                            <img src={item.vegetable.image} alt={item.vegetable.name[language]} className="w-20 h-20 rounded-lg object-cover flex-shrink-0"/>
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800 text-lg">{item.vegetable.name[language]}</p>
                                <p className="text-sm text-gray-600 font-semibold">{item.quantity}</p>
                                <p className="font-bold text-green-600 text-lg mt-1">
                                    ₹{item.calculatedPrice?.toFixed(2)}
                                </p>
                            </div>
                            <button onClick={() => removeItemFromWishlist(item.id)} className="text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-red-50 transition-colors disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed" disabled={isWishlistLocked}>
                                <TrashIcon />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-300 mb-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                      <path fillRule="evenodd" d="M3 8h14v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-700">Your list is empty</h3>
                    <p className="text-gray-500 mt-2">Go to the Home screen to add some vegetables.</p>
                </div>
            )}
        </main>

        {detailedWishlist.length > 0 && (
            <footer className="p-4 border-t bg-white flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-gray-700">Total Estimated Price</span>
                    <span className="text-2xl font-bold text-green-700">₹{totalPrice.toFixed(2)}</span>
                </div>
                <button
                    onClick={onConfirm}
                    disabled={detailedWishlist.length === 0 || isWishlistLocked}
                    className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center text-lg hover:bg-green-700 transition-transform disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isWishlistLocked ? "List is Locked" : t.confirmSelection}
                </button>
            </footer>
        )}
    </div>
  );
};

export default MyListScreen;