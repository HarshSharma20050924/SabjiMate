import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Language } from '../../../common/types';
import { translations } from '../../../common/constants';
import { calculateDistance, getWebSocketUrl } from '../../../common/utils';
import { AuthContext } from '../../../common/AuthContext';
import L from 'leaflet';

// Define custom icons
const homeIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTEwLjcwNyAyLjI5M2ExIDEgMCAwMC0xLjQxNCAwbC03IDdhMSAxIDAgMDAxLjQxNCAxLjQxNEw0IDEwLjQxNFYxN2ExIDEgMCAwMDEwIDFoMmExIDEgMCAwMDAtMXYtMmExIDEgMCAwMTEtMWgyYTEgMSAwIDAxMSAxdjJhMSAxIDAgMDAxIDFoMmExIDEgMCAwMDAtMXYtNi4wODZsLjI5My4yOTNhMSAxIDAgMDAxLjQxNC0xLjQxNGwtNy03eiIgLz48L3N2Zz4=',
    iconSize: [28, 28],
    className: 'bg-blue-600 p-1 rounded-full shadow-lg border-2 border-white'
});

const truckIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTggMTYuNWExLjUgMS41IDAgMTAtMyAwIDEuNSAxLjUgMCAwMTMgMHpNMTUgMTYuNWExLjUgMS41IDAgMTAtMyAwIDEuNSAxLjUgMCAwMTMgMHoiIC8+PHBhdGggZD0iTTMgNGEyIDIgMCAwMC0yIDJ2NmExIDEgMCAwMC0xIDB2MWExIDEgMCAwMDEgMWgxdi0xYTEgMSAwIDAxMS0xaDdhMiAyIDAgMDEyIDJ2M2EyIDIgMCAwMTItMkgzYTEgMSAwIDAwLTEgMXYxaC0xVjZhMSAxIDAgMDExLTFoMTFhMiAyIDAgMDEyIDJ2MmgtMVY2YTEgMSAwIDAwLTEtMUgzeiIgLz48L3N2Zz4=',
    iconSize: [32, 32],
    className: 'bg-green-600 p-1 rounded-full shadow-lg border-2 border-white'
});

const calculateETA = (distanceKm: number): string => {
    if (distanceKm < 0.1) return "Arriving now";
    const avgSpeedKmph = 15; // km/h
    const timeHours = distanceKm / avgSpeedKmph;
    const timeMinutes = Math.round(timeHours * 60);

    if (timeMinutes < 2) return "Arriving in under 2 mins";
    if (timeMinutes < 60) return `Approx. ${timeMinutes} mins away`;
    
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + timeMinutes * 60000);
    return `ETA: ${arrivalTime.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};


const LocationScreen: React.FC<{ language: Language, onClose: () => void }> = ({ language, onClose }) => {
  const t = translations[language];
  const { user } = useContext(AuthContext);

  const [truckLocation, setTruckLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [status, setStatus] = useState('Connecting to tracking service...');
  const ws = useRef<WebSocket | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const truckMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const userHomeLocation = useMemo(() => (user?.latitude && user?.longitude)
    ? { lat: user.latitude, lon: user.longitude }
    : null, [user?.latitude, user?.longitude]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
        const initialCenter: L.LatLngExpression = userHomeLocation ? [userHomeLocation.lat, userHomeLocation.lon] : [23.17, 75.78];
        mapRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView(initialCenter, 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(mapRef.current);

        if (userHomeLocation) {
            userMarkerRef.current = L.marker([userHomeLocation.lat, userHomeLocation.lon], { icon: homeIcon })
                .addTo(mapRef.current)
                .bindPopup('<b>Your Home</b>');
        }
    }
    
    ws.current = new WebSocket(getWebSocketUrl());

    ws.current.onopen = () => setStatus('Your SabziMATE is on the way!');
    ws.current.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'truck_location_broadcast' && data.payload) {
                setTruckLocation(data.payload);
                setStatus('Live Tracking Active');
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    };
    ws.current.onerror = () => setStatus('Connection error. Please check back soon.');
    ws.current.onclose = () => setStatus('Tracking service is currently offline.');

    return () => {
        ws.current?.close();
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, [userHomeLocation]);

  useEffect(() => {
    if (mapRef.current && truckLocation) {
        if (!truckMarkerRef.current) {
            truckMarkerRef.current = L.marker([truckLocation.lat, truckLocation.lon], { icon: truckIcon })
                .addTo(mapRef.current)
                .bindPopup("<b>SabziMATE Truck</b>");
        } else {
            truckMarkerRef.current.setLatLng([truckLocation.lat, truckLocation.lon]);
        }
        
        const markers: L.LatLngExpression[] = [[truckLocation.lat, truckLocation.lon]];
        if (userHomeLocation) {
            markers.push([userHomeLocation.lat, userHomeLocation.lon]);
        }
        mapRef.current.flyToBounds(L.latLngBounds(markers), { padding: [50, 50], maxZoom: 16 });
    }
  }, [truckLocation, userHomeLocation]);
  
  const distance = (truckLocation && userHomeLocation)
    ? calculateDistance(userHomeLocation.lat, userHomeLocation.lon, truckLocation.lat, truckLocation.lon)
    : null;

  return (
    <div className="absolute inset-0 bg-gray-100 z-40 animate-slide-in-right-fast flex flex-col">
       <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <h2 className="text-xl font-bold text-gray-800 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md">{t.locationTitle}</h2>
          <button onClick={onClose} className="text-lg text-green-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md hover:bg-white font-semibold">{t.close}</button>
      </header>

      <div ref={mapContainerRef} className="w-full h-full flex-grow">
        {!userHomeLocation && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-[1000]">
                <p className="text-white font-semibold bg-black/50 p-3 rounded-lg">Your address is not yet mapped.</p>
            </div>
        )}
      </div>
      
      <div className="absolute bottom-4 left-4 right-4 z-10 text-center bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
          {distance !== null && truckLocation ? (
              <>
                  <p className="text-gray-600">The truck is approximately</p>
                  <p className="text-4xl font-bold text-green-700 my-1">{distance.toFixed(2)} km away</p>
                  <p className="text-lg font-semibold text-blue-600">{calculateETA(distance)}</p>
              </>
          ) : (
              <p className="text-lg font-semibold text-gray-700">{status}</p>
          )}
      </div>
    </div>
  );
};

export default LocationScreen;
