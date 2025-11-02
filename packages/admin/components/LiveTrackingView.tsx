import React, { useState, useRef, useEffect } from 'react';
import { getTodaysDeliveries } from '@common/api';
import { User } from '@common/types';
import LoadingSpinner from '@common/components/LoadingSpinner';
import L from 'leaflet';
import { getWebSocketUrl } from '@common/utils';

interface StopWithCoords {
    user: User;
    coords: { lat: number; lon: number };
}

// Define custom icons
const homeIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTEwLjcwNyAyLjI5M2ExIDEgMCAwMC0xLjQxNCAwbC03IDdhMSAxIDAgMDAxLjQxNCAxLjQxNEw0IDEwLjQxNFYxN2ExIDEgMCAwMDEwIDFoMmExIDEgMCAwMDAtMXYtMmExIDEgMCAwMTEtMWgyYTEgMSAwIDAxMSAxdjJhMSAxIDAgMDAxIDFoMmExIDEgMCAwMDAtMXYtNi41ODZsLjI5My4yOTNhMSAxIDAgMDAxLjQxNC0xLjQxNGwtNy03eiIgLz48L3N2Zz4=',
    iconSize: [24, 24],
    className: 'bg-blue-500 p-1 rounded-full shadow-lg border-2 border-white'
});

const truckIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTggMTYuNWExLjUgMS41IDAgMTAtMyAwIDEuNSAxLjUgMCAwMTMgMHpNMTUgMTYuNWExLjUgMS41IDAgMTAtMyAwIDEuNSAxLjUgMCAwMTMgMHoiIC8+PHBhdGggZD0iTTMgNGEyIDIgMCAwMC0yIDJ2NmExIDEgMCAwMC0xIDB2MWExIDEgMCAwMDEgMWgxdi0xYTEgMSAwIDAxMS0xaDdhMiAyIDAgMDEyIDJ2M2EyIDIgMCAwMTItMkgzYTEgMSAwIDAwLTEgMXYxaC0xVjZhMSAxIDAgMDExLTFoMTFhMiAyIDAgMDEyIDJ2MmgtMVY2YTEgMSAwIDAwLTEtMUgzeiIgLz48L3N2Zz4=',
    iconSize: [32, 32],
    className: 'bg-green-600 p-1 rounded-full shadow-lg border-2 border-white'
});


const LiveTrackingView: React.FC = () => {
    const [truckLocation, setTruckLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [stopCoordinates, setStopCoordinates] = useState<StopWithCoords[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('Initializing...');
    const ws = useRef<WebSocket | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const truckMarkerRef = useRef<L.Marker | null>(null);

    // Fetch and geocode delivery stops on initial render
    useEffect(() => {
        // Initialize map
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([23.17, 75.78], 13); // Default to Ujjain
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }).addTo(mapRef.current);
        }

        const fetchStops = async () => {
            try {
                const { confirmed } = await getTodaysDeliveries();
                const stopsWithCoords = confirmed
                    .filter(user => user.latitude && user.longitude)
                    .map(user => ({
                        user,
                        coords: { lat: user.latitude!, lon: user.longitude! }
                    }));
                setStopCoordinates(stopsWithCoords);

                // Add markers for stops
                if (mapRef.current) {
                    stopsWithCoords.forEach(stop => {
                        L.marker([stop.coords.lat, stop.coords.lon], { icon: homeIcon })
                            .addTo(mapRef.current!)
                            .bindPopup(`<b>${stop.user.name}</b><br>${stop.user.address}`);
                    });
                }

            } catch (err) {
                console.error("Failed to load delivery stops for tracking", err);
                setStatus("Could not load stops.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStops();
    }, []);

    // Effect for WebSocket connection
    useEffect(() => {
        ws.current = new WebSocket(getWebSocketUrl());

        ws.current.onopen = () => setStatus('Connected. Waiting for driver location...');
        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'truck_location_broadcast' && data.payload) {
                    setTruckLocation(data.payload);
                    setStatus('Live Tracking Active');
                }
            } catch (e) {
                console.error('Error parsing broadcast message:', e);
            }
        };
        ws.current.onerror = () => setStatus('Connection error.');
        ws.current.onclose = () => setStatus('Disconnected from tracking service.');

        return () => {
            ws.current?.close();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);
    
    // Update truck marker
    useEffect(() => {
        if (mapRef.current && truckLocation) {
            if (!truckMarkerRef.current) {
                truckMarkerRef.current = L.marker([truckLocation.lat, truckLocation.lon], { icon: truckIcon, zIndexOffset: 1000 })
                    .addTo(mapRef.current)
                    .bindPopup("<b>SabziMATE Truck</b>");
            } else {
                truckMarkerRef.current.setLatLng([truckLocation.lat, truckLocation.lon]);
            }
            mapRef.current.panTo([truckLocation.lat, truckLocation.lon]);
        }
    }, [truckLocation]);


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Live Delivery Tracking</h2>
                <p className="text-md font-semibold text-gray-600">Status: <span className="font-bold text-blue-600">{status}</span></p>
            </div>
            
            {isLoading ? <LoadingSpinner /> : (
                <div ref={mapContainerRef} className="w-full h-[70vh] bg-green-100 rounded-lg overflow-hidden shadow-inner border relative">
                    {!truckLocation && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-[1000]">
                            <p className="text-white text-xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded-lg">Waiting for driver to start broadcasting...</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LiveTrackingView;
