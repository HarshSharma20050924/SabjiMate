import React, { useRef, useEffect } from 'react';
import { User } from '@common/types';
import L from 'leaflet';

interface MapScreenProps {
    driverLocation: { lat: number; lon: number };
    stops: (User & { distance: number })[];
}

// Re-define icons locally for this component
const customerIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTEwLjcwNyAyLjI5M2ExIDEgMCAwMC0xLjQxNCAwbC03IDdhMSAxIDAgMDAxLjQxNCAxLjQxNEw0IDEwLjQxNFYxN2ExIDEgMCAwMDEwIDFoMmExIDEgMCAwMDAtMXYtMmExIDEgMCAwMTEtMWgyYTEgMSAwIDAxMSAxdjJhMSAxIDAgMDAxIDFoMmExIDEgMCAwMDAtMXYtNi41ODZsLjI5My4yOTNhMSAxIDAgMDAxLjQxNC0xLjQxNGwtNy03eiIgLz48L3N2Zz4=',
    iconSize: [28, 28],
    className: 'bg-blue-600 p-1 rounded-full shadow-lg border-2 border-white'
});

const driverIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTggMTYuNWExLjUgMS41IDAgMTAtMyAwIDEuNSAxLjUgMCAwMTMgMHpNMTUgMTYuNWExLjUgMS41IDAgMTAtMyAwIDEuNSAxLjUgMCAwMTMgMHoiIC8+PHBhdGggZD0iTTMgNGEyIDIgMCAwMC0yIDJ2NmExIDEgMCAwMC0xIDB2MWExIDEgMCAwMDEgMWgxdi0xYTEgMSAwIDAxMS0xaDdhMiAyIDAgMDEyIDJ2M2EyIDIgMCAwMTItMkgzYTEgMSAwIDAwLTEgMXYxaC0xVjZhMSAxIDAgMDExLTFoMTFhMiAyIDAgMDEyIDJ2MmgtMVY2YTEgMSAwIDAwLTEtMUgzeiIgLz48L3N2Zz4=',
    iconSize: [32, 32],
    className: 'bg-green-600 p-1 rounded-full shadow-lg border-2 border-white'
});

const MapScreen: React.FC<MapScreenProps> = ({ driverLocation, stops }) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([driverLocation.lat, driverLocation.lon], 14);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }).addTo(mapRef.current);
        }

        const map = mapRef.current;
        if (!map) return;

        // Clear previous layers, except the tile layer
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        // Add driver marker
        L.marker([driverLocation.lat, driverLocation.lon], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);

        if (stops.length > 0) {
            const routeLatLngs: L.LatLngExpression[] = stops.map(stop => [stop.latitude!, stop.longitude!]);
            
            // Add customer markers
            stops.forEach((stop, index) => {
                L.marker([stop.latitude!, stop.longitude!], { icon: customerIcon })
                 .addTo(map)
                 .bindPopup(`<b>#${index + 1}: ${stop.name}</b><br>~${stop.distance.toFixed(2)} km away`);
            });

            // Add polyline for the route
            const fullRoutePath: L.LatLngExpression[] = [[driverLocation.lat, driverLocation.lon], ...routeLatLngs];
            const routePolyline = L.polyline(fullRoutePath, { color: 'blue', weight: 4, opacity: 0.7 }).addTo(map);

            // Fit map to show the entire route
            map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
        } else {
             map.setView([driverLocation.lat, driverLocation.lon], 14);
        }

    }, [driverLocation, stops]);

    return (
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: 'calc(100vh - 128px)'}} />
    );
};

export default MapScreen;
