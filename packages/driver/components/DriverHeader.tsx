import React from 'react';

interface DriverHeaderProps {
    driverName?: string;
    onLogout: () => void;
    isBroadcasting: boolean;
    onToggleBroadcast: () => void;
    isOnline: boolean;
}

const DriverHeader: React.FC<DriverHeaderProps> = ({ driverName, onLogout, isBroadcasting, onToggleBroadcast, isOnline }) => {
    return (
        <header className="bg-white shadow-md p-3 flex justify-between items-center sticky top-0 z-20 h-20">
            <div className="flex items-center space-x-3">
                 <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span className="text-xs font-semibold text-gray-500">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-800">Driver Mode</h1>
                    {driverName && <p className="text-sm text-gray-600">Welcome, {driverName}</p>}
                </div>
            </div>
            <div className="flex items-center space-x-4">
                 <div className="flex flex-col items-center">
                    <label className={`relative inline-flex items-center cursor-pointer p-2 rounded-full ${isBroadcasting ? 'animate-pulse-broadcast' : ''}`}>
                        <input type="checkbox" checked={isBroadcasting} onChange={onToggleBroadcast} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                    <span className="text-xs font-semibold text-gray-600 -mt-1">Broadcast</span>
                </div>
                <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg">
                    Logout
                </button>
            </div>
        </header>
    );
};

export default DriverHeader;