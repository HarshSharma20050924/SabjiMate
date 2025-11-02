import React, { useState, useEffect, useCallback } from 'react';
import { AggregatedWishlistItem, UserWishlist } from '@common/types';
import { getDriverTodaysWishlist, getDriverTodaysWishlistByUser } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';

const SummaryScreen: React.FC = () => {
  const [view, setView] = useState<'summary' | 'byUser'>('summary');
  const [summaryWishlist, setSummaryWishlist] = useState<AggregatedWishlistItem[]>([]);
  const [userWishlists, setUserWishlists] = useState<UserWishlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [summaryData, byUserData] = await Promise.all([
            getDriverTodaysWishlist(),
            getDriverTodaysWishlistByUser()
        ]);
        setSummaryWishlist(summaryData);
        setUserWishlists(byUserData);
    } catch (error) {
        console.error("Failed to fetch wishlist data:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderSummary = () => (
     summaryWishlist.length > 0 ? (
        <ul className="space-y-3">
            {summaryWishlist.sort((a,b) => b.totalQuantity - a.totalQuantity).map(item => (
                <li key={item.name} className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <span className="font-semibold text-gray-800 text-lg">{item.name}</span>
                    <span className="font-bold text-blue-600 text-lg">{item.totalQuantity.toFixed(2)} {item.unit}</span>
                </li>
            ))}
        </ul>
    ) : (
        <p className="text-gray-500 text-center p-6 bg-white rounded-lg">No wishlist items for today.</p>
    )
  );

  const renderByUser = () => (
    userWishlists.length > 0 ? (
        <div className="space-y-4">
            {userWishlists.map(({ user, items }) => (
                <div key={user.phone} className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">{user.name}</h4>
                    {items.length > 0 ? (
                        <ul className="space-y-1 text-sm">
                            {items.map(item => (
                                <li key={item.vegetableName} className="flex justify-between">
                                    <span className="text-gray-700">{item.vegetableName}</span>
                                    <span className="font-semibold text-gray-900">{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-500 italic">Confirmed, but no items pre-selected.</p>
                    )}
                </div>
            ))}
        </div>
    ) : (
        <p className="text-gray-500 text-center p-6 bg-white rounded-lg">No customers have submitted a wishlist today.</p>
    )
  );

  return (
    <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Daily Summary</h2>
        <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6">
                <button onClick={() => setView('summary')} className={`py-3 px-1 border-b-2 font-semibold ${view === 'summary' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Stock Summary
                </button>
                <button onClick={() => setView('byUser')} className={`py-3 px-1 border-b-2 font-semibold ${view === 'byUser' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    By Customer
                </button>
            </nav>
        </div>
        {isLoading ? <LoadingSpinner /> : (view === 'summary' ? renderSummary() : renderByUser())}
    </div>
  );
};

export default SummaryScreen;