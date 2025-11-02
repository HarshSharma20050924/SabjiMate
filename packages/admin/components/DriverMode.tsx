

import React, { useState, useRef, useEffect, useContext } from 'react';
import { getTodaysDeliveries } from '@common/api';
import { User } from '@common/types';
import LoadingSpinner from '@common/components/LoadingSpinner';
import { convertCoordsToPercent } from '@common/geolocationUtils';
import { AuthContext } from '@common/AuthContext';

interface StopWithCoords {
    user: User;
    coords: { lat: number; lon: number };
}

// Marker components for the map
const HomeMarker: React.FC<{ top: number; left: number; name: string; }> = ({ top, left, name }) => (
    <div className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-1000" style={{ top: `${top}%`, left: `${left}%` }}>
        <div className="relative flex flex-col items-center">
            <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap -mt-8">
                {name.split(' ')[0]}
            </div>
            <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-blue-500"></div>
            <div className="p-1 bg-blue-500 rounded-full shadow-lg ring-2 ring-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
            </div>
        </div>
    </div>
);

const DriverMarker: React.FC<{ top: number; left: number; }> = ({ top, left }) => (
     <div className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000" style={{ top: `${top}%`, left: `${left}%` }}>
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-xl animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v1h10a2 2 0 012 2v3a2 2 0 01-2 2H3a1 1 0 01-1-1v-1H1V6a2 2 0 012-2h11a1 1 0 011 1v2h-1V6a1 1 0 00-1-1H3z" />
            </svg>
        </div>
    </div>
);


const DriverDashboard: React.FC = () => {
    const { logout } = useContext(AuthContext);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [confirmedStops, setConfirmedStops] = useState<User[]>([]);
    const [stopCoordinates, setStopCoordinates] = useState<StopWithCoords[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const watchId = useRef<number | null>(null);

    useEffect(() => {
        const fetchAndGeocodeStops = async () => {
            try {
                const { confirmed } = await getTodaysDeliveries();
                setConfirmedStops(confirmed.sort((a,b) => a.name.localeCompare(b.name)));

                const stopsWithCoords = confirmed
                    .filter(user => user.latitude && user.longitude)
                    .map(user => ({
                        user,
                        coords: { lat: user.latitude!, lon: user.longitude! }
                    }));
                
                setStopCoordinates(stopsWithCoords);

            } catch (err) {
                console.error("Failed to fetch or geocode delivery stops", err);
                setError("Could not load delivery stops.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAndGeocodeStops();
    }, []);

    const handleToggleBroadcast = () => {
        if (isBroadcasting) {
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
            if (ws.current) ws.current.close();
            watchId.current = null;
            ws.current = null;
            setIsBroadcasting(false);
            setLocation(null);
        } else {
            setError(null);
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = `${protocol}://${window.location.hostname}:3001`;
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected for driver');
                setIsBroadcasting(true);
                watchId.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        const newLocation = { lat: latitude, lon: longitude };
                        setLocation(newLocation);
                        if (ws.current?.readyState === WebSocket.OPEN) {
                           ws.current.send(JSON.stringify({ type: 'driver_location_update', payload: newLocation }));
                        }
                    },
                    (geoError) => {
                        setError(`Geolocation Error: ${geoError.message}`);
                        handleToggleBroadcast();
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            };
            ws.current.onerror = () => setError('WebSocket connection failed.');
            ws.current.onclose = () => {
                if(isBroadcasting) handleToggleBroadcast();
            };
        }
    };
    
    const driverPosition = location ? convertCoordsToPercent(location.lat, location.lon) : null;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-20">
                <h1 className="text-xl font-bold text-gray-800">Driver Mode</h1>
                <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg">Logout</button>
            </header>
            <main className="flex-grow overflow-y-auto p-6 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-semibold">Location Broadcasting</h3>
                            <p className={`mt-1 font-bold ${isBroadcasting ? 'text-green-600' : 'text-red-600'}`}>
                                Status: {isBroadcasting ? 'ACTIVE' : 'INACTIVE'}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleBroadcast}
                            className={`px-6 py-3 text-white font-bold rounded-lg shadow-md w-48 ${
                                isBroadcasting ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
                        </button>
                    </div>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                </div>

                <h3 className="text-xl font-semibold text-gray-800">Route Map</h3>
                <div className="relative w-full h-96 bg-gray-300 rounded-lg overflow-hidden shadow-inner border">
                    <img src="https://picsum.photos/id/10/800/600" alt="Map Area" className="w-full h-full object-cover opacity-40" />
                    {stopCoordinates.map(({ user, coords }) => {
                        const pos = convertCoordsToPercent(coords.lat, coords.lon);
                        return <HomeMarker key={user.phone} top={pos.top} left={pos.left} name={user.name} />;
                    })}
                    {driverPosition && <DriverMarker top={driverPosition.top} left={driverPosition.left} />}
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Delivery Stops ({confirmedStops.length})</h3>
                    {isLoading ? <LoadingSpinner /> : (
                        <div className="bg-white rounded-lg shadow">
                            {confirmedStops.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {confirmedStops.map((user) => (
                                        <li key={user.phone} className="p-4">
                                            <p className="font-semibold text-gray-900">{user.name}</p>
                                            <p className="text-sm text-gray-600 mt-1 font-medium">{user.address}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="p-4 text-gray-500">No confirmed deliveries for today.</p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DriverDashboard;