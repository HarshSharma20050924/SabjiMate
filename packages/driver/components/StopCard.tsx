import React from 'react';
import { User } from '@common/types';

interface StopCardProps {
  user: User & { distance: number };
  onManageUser: () => void;
  stopNumber: number;
}

const StopCard: React.FC<StopCardProps> = ({ user, onManageUser, stopNumber }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-gray-200 text-gray-700 font-bold text-xl rounded-full flex items-center justify-center ring-2 ring-gray-300">
            {stopNumber}
        </div>
        <div className="flex-grow min-w-0">
            <p className="font-bold text-lg text-gray-800 truncate">{user.name}</p>
            <p className="text-sm text-gray-600 mt-1 truncate">{user.address}</p>
            <p className="text-sm font-semibold text-blue-600 mt-1">{user.distance.toFixed(2)} km away</p>
        </div>
        <div className="flex-shrink-0">
            <button
                onClick={onManageUser}
                className="bg-blue-600 text-white font-bold py-3 px-5 rounded-lg shadow-md hover:bg-blue-700 flex items-center space-x-2"
            >
                <span>Manage</span>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    </div>
  );
};

export default StopCard;