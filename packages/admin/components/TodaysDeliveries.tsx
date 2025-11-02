import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, AggregatedWishlistItem, UserWishlist } from '@common/types';
import { getTodaysDeliveries, getTodaysWishlist, getTodaysWishlistByUser } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import { getWebSocketUrl } from '@common/utils';

const RefreshIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);

const UserCard: React.FC<{user: User}> = ({ user }) => (
    <li className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <p className="font-semibold text-gray-900">{user.name}</p>
      <p className="text-sm text-gray-600">{user.phone}</p>
      <p className="text-sm text-gray-600 mt-1">{user.address}</p>
    </li>
);

const StatCard: React.FC<{ title: string; value: string; color: string }> = ({ title, value, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex-1">
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h4>
        <p className={`text-4xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
);

const WishlistCard: React.FC<{ items: AggregatedWishlistItem[] }> = ({ items }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Today's Wishlist Summary</h3>
        {items.length > 0 ? (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
                {items.sort((a,b) => b.totalQuantity - a.totalQuantity).map(item => (
                    <li key={item.name} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span className="font-semibold text-gray-800">{item.name}</span>
                        <span className="font-bold text-blue-600">{item.totalQuantity.toFixed(2)} {item.unit}</span>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500">No wishlist items have been selected by users yet.</p>
        )}
    </div>
);

const DetailedWishlistView: React.FC = () => {
    const [userWishlists, setUserWishlists] = useState<UserWishlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await getTodaysWishlistByUser();
                setUserWishlists(data);
            } catch (error) {
                console.error("Failed to fetch detailed wishlist", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, []);

    if (isLoading) return <LoadingSpinner />;

    if (userWishlists.length === 0) {
        return <div className="text-center text-gray-500 mt-8 bg-white p-6 rounded-lg shadow-sm"><p>No users have confirmed delivery with a wishlist today.</p></div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userWishlists.map(({ user, items }) => (
                <div key={user.phone} className="bg-white p-4 rounded-lg shadow-md">
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
                        <p className="text-xs text-gray-500 italic">Confirmed, but no items selected in wishlist.</p>
                    )}
                </div>
            ))}
        </div>
    );
};


const TodaysDeliveries: React.FC = () => {
  const [confirmations, setConfirmations] = useState<User[]>([]);
  const [rejections, setRejections] = useState<User[]>([]);
  const [wishlist, setWishlist] = useState<AggregatedWishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const ws = useRef<WebSocket | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [{ confirmed, rejected }, wishlistData] = await Promise.all([
          getTodaysDeliveries(),
          getTodaysWishlist()
      ]);
      setConfirmations(confirmed);
      setRejections(rejected);
      setWishlist(wishlistData);
    } catch (error) {
      console.error("Failed to fetch initial delivery data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); 

    ws.current = new WebSocket(getWebSocketUrl());

    ws.current.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'wishlist_update' && data.payload) {
                // Directly update the wishlist state from the WebSocket payload
                setWishlist(data.payload);
            }
        } catch (e) {
            console.error('Error parsing wishlist update:', e);
        }
    };
    
    return () => ws.current?.close();
  }, [fetchData]);

  const renderSummaryView = () => (
     <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column for Stats and Wishlist */}
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <StatCard title="Confirmed Stops" value={String(confirmations.length)} color="text-green-600" />
                    <StatCard title="Declined Stops" value={String(rejections.length)} color="text-red-600" />
                </div>
                <WishlistCard items={wishlist} />
            </div>

            {/* Right Column for User Lists */}
            <div>
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                            Confirmed Deliveries
                        </h3>
                        {confirmations.length > 0 ? (
                          <ul className="space-y-3 max-h-[400px] overflow-y-auto">
                            {confirmations.map((user) => (
                              <UserCard key={user.phone} user={user} />
                            ))}
                          </ul>
                        ) : (
                          <div className="text-center text-gray-500 mt-8 bg-white p-6 rounded-lg shadow-sm">
                            <p>No users have confirmed for delivery yet.</p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                         <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-red-500 rounded-full mr-3"></span>
                            Declined Deliveries
                        </h3>
                        {rejections.length > 0 ? (
                          <ul className="space-y-3 max-h-[400px] overflow-y-auto">
                            {rejections.map((user) => (
                              <UserCard key={user.phone} user={user} />
                            ))}
                          </ul>
                        ) : (
                          <div className="text-center text-gray-500 mt-8 bg-white p-6 rounded-lg shadow-sm">
                            <p>No users have declined delivery yet.</p>
                          </div>
                        )}
                      </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-800">Today's Delivery Dashboard</h2>
                <button onClick={fetchData} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400">
                    <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
             <div className="flex items-center space-x-2 bg-gray-200 rounded-full p-1">
                <button onClick={() => setViewMode('summary')} className={`px-4 py-1 text-sm font-semibold rounded-full ${viewMode === 'summary' ? 'bg-white shadow' : 'text-gray-600'}`}>Summary</button>
                <button onClick={() => setViewMode('detailed')} className={`px-4 py-1 text-sm font-semibold rounded-full ${viewMode === 'detailed' ? 'bg-white shadow' : 'text-gray-600'}`}>User Wishlists</button>
            </div>
        </div>
      {isLoading ? <LoadingSpinner /> : (
          viewMode === 'summary' ? renderSummaryView() : <DetailedWishlistView />
      )}
    </div>
  );
};

export default TodaysDeliveries;