import React, { useState, useEffect, useCallback } from 'react';
import { getWishlistLockStatusForAdmin, updateWishlistLockStatus } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';

const WishlistLockControl: React.FC = () => {
    const [isLocked, setIsLocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');

    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const { isLocked: currentStatus } = await getWishlistLockStatusForAdmin();
            setIsLocked(currentStatus);
        } catch (err) {
            setError('Failed to load current lock status.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleToggle = async () => {
        setIsUpdating(true);
        setError('');
        try {
            const { isLocked: newStatus } = await updateWishlistLockStatus(!isLocked);
            setIsLocked(newStatus);
        } catch (err) {
            setError('Failed to update lock status. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Wishlist Lock Control</h2>
            <p className="text-gray-600 mb-6">
                Use this toggle to manually lock or unlock the daily wishlist for all users.
                When locked, users cannot make any changes to their list for today's delivery.
            </p>

            <div className={`p-4 rounded-lg flex items-center justify-between ${isLocked ? 'bg-red-100' : 'bg-green-100'}`}>
                <div className="font-bold text-lg">
                    {isLocked ? (
                        <span className="text-red-800">Wishlists are LOCKED</span>
                    ) : (
                        <span className="text-green-800">Wishlists are OPEN</span>
                    )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={isLocked} 
                        onChange={handleToggle} 
                        disabled={isUpdating}
                        className="sr-only peer" 
                    />
                    <div className="w-14 h-8 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                </label>
            </div>
            {isUpdating && <p className="text-sm text-blue-600 mt-2">Updating status...</p>}
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
    );
};

export default WishlistLockControl;