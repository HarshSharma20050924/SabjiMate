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

// Custom icons
const homeIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...',
    iconSize: [24, 24],
    className: 'bg-blue-500 p-1 rounded-full shadow-lg border-2 border-white'
});

const truckIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...',
    iconSize: [32, 32],
    className: 'bg-green-600 p-1 rounded-full shadow-lg border-2 border-white animate-pulse-marker'
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
    const latestLocation = useRef<{ lat: number; lon: number } | null>(null);

    // Initialize map once
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([23.17, 75.78], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current);
        }
    }, []);

    // Fetch delivery stops
    useEffect(() => {
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

                if (mapRef.current) {
                    // Limit markers to avoid UI freeze
                    stopsWithCoords.slice(0, 50).forEach(stop => {
                        L.marker([stop.coords.lat, stop.coords.lon], { icon: homeIcon })
                            .addTo(mapRef.current!)
                            .bindPopup(`<b>${stop.user.name}</b><br>${stop.user.address}`);
                    });
                }
            } catch (err) {
                console.error("Failed to load delivery stops", err);
                setStatus("Could not load stops.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStops();
    }, []);

    // WebSocket connection for live truck updates
    useEffect(() => {
        ws.current = new WebSocket(getWebSocketUrl());

        ws.current.onopen = () => setStatus('Connected. Waiting for driver location...');
        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'truck_location_broadcast' && data.payload) {
                    const { lat, lon } = data.payload;
                    // Only update if location changed
                    if (!latestLocation.current || latestLocation.current.lat !== lat || latestLocation.current.lon !== lon) {
                        latestLocation.current = { lat, lon };
                        setTruckLocation({ lat, lon });
                        setStatus('Live Tracking Active');
                    }
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        };
        ws.current.onerror = () => setStatus('Connection error.');
        ws.current.onclose = () => setStatus('Disconnected from tracking service.');

        return () => {
            ws.current?.close();
        };
    }, []);

    // Update truck marker on map
    useEffect(() => {
        if (!mapRef.current || !truckLocation) return;

        const newLatLng = L.latLng(truckLocation.lat, truckLocation.lon);

        if (!truckMarkerRef.current) {
            truckMarkerRef.current = L.marker(newLatLng, { icon: truckIcon, zIndexOffset: 1000 })
                .addTo(mapRef.current)
                .bindPopup("<b>SabziMATE Truck</b>");
            mapRef.current.flyTo(newLatLng, 15);
        } else {
            truckMarkerRef.current.setLatLng(newLatLng);
            mapRef.current.flyTo(newLatLng, mapRef.current.getZoom(), { animate: true, duration: 1.5 });
        }
    }, [truckLocation]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Live Delivery Tracking</h2>
                <p className="text-md font-semibold text-gray-600">
                    Status: <span className="font-bold text-blue-600">{status}</span>
                </p>
            </div>

            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <div ref={mapContainerRef} className="w-full h-[60vh] bg-green-100 rounded-lg overflow-hidden shadow-inner border relative">
                    {!truckLocation && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-[1000] pointer-events-none">
                            <p className="text-white text-xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                                Waiting for driver to start broadcasting...
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LiveTrackingView;
