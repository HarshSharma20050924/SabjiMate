import React from 'react';
import { User } from '@common/types';
import StopCard from '../StopCard';
import LoadingSpinner from '@common/components/LoadingSpinner';

interface RouteScreenProps {
    stops: (User & { distance: number })[];
    onManageUser: (user: User) => void;
    isLoading: boolean;
    onRefresh: () => void;
}

const RouteScreen: React.FC<RouteScreenProps> = ({ stops, onManageUser, isLoading, onRefresh }) => {
    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Today's Route</h2>
                <button onClick={onRefresh} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 font-semibold p-2 rounded-md hover:bg-gray-200">
                    Refresh
                </button>
            </div>

            {isLoading ? <LoadingSpinner /> : (
                stops.length > 0 ? (
                    stops.map((user, index) => (
                        <StopCard 
                            key={user.phone} 
                            user={user} 
                            stopNumber={index + 1} 
                            onManageUser={() => onManageUser(user)} 
                        />
                    ))
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500 mt-8">
                        <p className="font-semibold">No confirmed deliveries for today.</p>
                        <p className="text-sm mt-2">Stops will appear here once customers confirm their orders.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default RouteScreen;