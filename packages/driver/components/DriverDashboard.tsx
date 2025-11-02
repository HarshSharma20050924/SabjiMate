import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { getDriverTodaysDeliveries, getDriverTodaysWishlistByUser } from '@common/api';
import { User, UserWishlist } from '@common/types';
import LoadingSpinner from '@common/components/LoadingSpinner';
import { AuthContext } from '@common/AuthContext';
import { calculateDistance, getWebSocketUrl } from '@common/utils';
import UserActionModal from './UserActionModal';

// Import new components
import DriverHeader from './DriverHeader';
import BottomNav from './BottomNav';
import RouteScreen from './screens/RouteScreen';
import MapScreen from './screens/MapScreen';
import SummaryScreen from './screens/SummaryScreen';


type PermissionStatusState = 'loading' | 'prompt' | 'granted' | 'denied';
type ActiveTab = 'route' | 'map' | 'summary';

const DriverDashboard: React.FC<{ isOnline: boolean }> = ({ isOnline }) => {
    const { logout, user: driver } = useContext(AuthContext);
    
    // Permission and Location State
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatusState>('loading');
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    
    // Data State
    const [allStops, setAllStops] = useState<User[]>([]);
    const [userWishlists, setUserWishlists] = useState<UserWishlist[]>([]);
    const [sortedStops, setSortedStops] = useState<(User & { distance: number })[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // UI State
    const [activeTab, setActiveTab] = useState<ActiveTab>('route');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [managingUser, setManagingUser] = useState<User | null>(null);

    // Refs
    const ws = useRef<WebSocket | null>(null);
    const watchId = useRef<number | null>(null);

    // 1. Check and monitor geolocation permission status
    useEffect(() => {
        if (!navigator.permissions) {
            setError("Permissions API not supported. Please use a modern browser.");
            setPermissionStatus('denied');
            return;
        }
        
        let permissionObj: PermissionStatus;
        
        const checkPermission = async () => {
            try {
                permissionObj = await navigator.permissions.query({ name: 'geolocation' });
                const initialStatus = permissionObj.state === 'granted' ? 'granted' : 'prompt';
                setPermissionStatus(initialStatus);

                permissionObj.onchange = () => {
                    setPermissionStatus(permissionObj.state as 'prompt' | 'granted' | 'denied');
                };
            } catch (e) {
                setError("Could not query geolocation permission.");
                setPermissionStatus('denied');
            }
        };

        checkPermission();
        return () => { if (permissionObj) permissionObj.onchange = null; };
    }, []);

    // 2. Function to request location
    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }
        setIsFetchingLocation(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
                setIsFetchingLocation(false);
            },
            (err) => {
                setError(`Could not get location: ${err.message}`);
                setIsFetchingLocation(false);
                setPermissionStatus('denied');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setIsLoadingData(true);
            const [{ confirmed }, wishlistsData] = await Promise.all([
                getDriverTodaysDeliveries(),
                getDriverTodaysWishlistByUser()
            ]);
            setAllStops(confirmed);
            setUserWishlists(wishlistsData);
        } catch (err) {
            setError("Could not load delivery stops.");
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    // 3. Trigger location request and data fetch based on permissions and state
    useEffect(() => {
        if (permissionStatus === 'granted' && !location && !isFetchingLocation) {
            requestLocation();
        }
        if (location && allStops.length === 0) {
            fetchData();
        }
    }, [permissionStatus, location, isFetchingLocation, allStops.length, fetchData, requestLocation]);
    
    // 4. Sort stops whenever location or the list of stops changes
    useEffect(() => {
        if (!location || allStops.length === 0) return;

        const stopsWithDistance = allStops
            .filter(stop => stop.latitude && stop.longitude)
            .map(stop => ({
                ...stop,
                distance: calculateDistance(location.lat, location.lon, stop.latitude!, stop.longitude!),
            }));

        setSortedStops(stopsWithDistance.sort((a, b) => a.distance - b.distance));
    }, [location, allStops]);

    const handleToggleBroadcast = () => {
        if (isBroadcasting) {
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
            if (ws.current) ws.current.close();
            watchId.current = null;
            ws.current = null;
            setIsBroadcasting(false);
        } else {
            setError(null);
            ws.current = new WebSocket(getWebSocketUrl());

            ws.current.onopen = () => {
                setIsBroadcasting(true);
                watchId.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const newLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
                        setLocation(newLocation);
                        if (ws.current?.readyState === WebSocket.OPEN) {
                           ws.current.send(JSON.stringify({ type: 'driver_location_update', payload: newLocation }));
                        }
                    },
                    (geoError) => {
                        setError(`Geolocation Error: ${geoError.message}`);
                        handleToggleBroadcast(); // Toggles it off
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            };
            ws.current.onerror = () => setError('WebSocket connection failed.');
            ws.current.onclose = () => { if (isBroadcasting) handleToggleBroadcast(); };
        }
    };
    
    // --- Unified Loading / Permission Screen ---
    const StartupScreen: React.FC<{ status: PermissionStatusState, isFetching: boolean, errorMsg: string | null, onRequest: () => void }> = ({ status, isFetching, errorMsg, onRequest }) => {
        let title = "Checking Permissions...";
        let message = "Please wait while we check your device's location settings.";
        let showButton = false;

        if (status === 'prompt') {
            title = "Location Access Required";
            message = "We need your location to build your delivery route. Please grant permission when prompted.";
            showButton = true;
        } else if (status === 'denied') {
            title = "Location Access Denied";
            message = "Please enable location permissions in your browser or system settings to use the driver app.";
        } else if (isFetching) {
            title = "Getting Your Location...";
            message = "This may take a moment. Please ensure you have a clear view of the sky.";
        }

        return (
             <div className="flex flex-col h-screen bg-gray-50">
                <DriverHeader onLogout={logout} isBroadcasting={false} onToggleBroadcast={() => {}} isOnline={isOnline} />
                <main className="flex-grow flex items-center justify-center p-6 text-center">
                    {isFetching || status === 'loading' ? (
                        <div className="flex flex-col items-center">
                            <LoadingSpinner />
                            <p className="mt-4 text-lg font-semibold text-gray-700">{title}</p>
                            <p className="mt-1 text-gray-500">{message}</p>
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
                            <h2 className="text-2xl font-bold text-gray-800 mt-4">{title}</h2>
                            <p className="text-gray-600 mt-2 mb-6">{message}</p>
                            {showButton && <button onClick={onRequest} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-blue-700">Grant Permission</button>}
                            {errorMsg && <p className="text-red-500 mt-4 text-sm">{errorMsg}</p>}
                        </div>
                    )}
                </main>
            </div>
        );
    };

    if (permissionStatus !== 'granted' || !location) {
        return <StartupScreen status={permissionStatus} isFetching={isFetchingLocation} errorMsg={error} onRequest={requestLocation} />;
    }
    
    const userWishlist = userWishlists.find(w => w.user.phone === managingUser?.phone);

    // --- Main App UI ---
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <DriverHeader onLogout={logout} driverName={driver?.name} isBroadcasting={isBroadcasting} onToggleBroadcast={handleToggleBroadcast} isOnline={isOnline} />
            
            <main className="flex-grow overflow-y-auto pb-16">
                {activeTab === 'route' && <RouteScreen stops={sortedStops} onManageUser={setManagingUser} isLoading={isLoadingData} onRefresh={fetchData} />}
                {activeTab === 'map' && <MapScreen driverLocation={location} stops={sortedStops} />}
                {activeTab === 'summary' && <SummaryScreen />}
            </main>
            
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

            {managingUser && <UserActionModal user={managingUser} wishlist={userWishlist?.items || []} onClose={() => { setManagingUser(null); fetchData(); }} />}
        </div>
    );
};

export default DriverDashboard;
