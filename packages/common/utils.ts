// This function calculates the distance between two points on Earth (lat/lon)
// using the Haversine formula. The result is in kilometers.
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon)) / 2;

    return R * 2 * Math.asin(Math.sqrt(a));
}

// Calculates the price for a given quantity based on a price per kilogram.
export const calculateItemPrice = (vegetablePricePerKg: number, quantity: string): number | null => {
    if (!quantity) return null;
    
    const quantityValue = parseFloat(quantity);
    const quantityUnit = quantity.replace(/[0-9.]/g, '').toLowerCase();

    if (isNaN(quantityValue)) return null;

    let multiplier = 0;
    if (quantityUnit === 'kg') {
        multiplier = quantityValue;
    } else if (quantityUnit === 'g') {
        multiplier = quantityValue / 1000;
    } else {
        return null; // Should not happen with current options
    }
    
    return vegetablePricePerKg * multiplier;
};

// Provides a single, correct URL for WebSocket connections, handling both
// local development (via Vite proxy) and production environments.
export const getWebSocketUrl = (): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocal) {
        // In local dev, connect to the vite server on its port, using the /socket path for proxying
        return `${protocol}://${host}/socket`;
    }
    
    // In production, connect to the dedicated Render.com backend WebSocket
    return 'wss://sabzimate-server.onrender.com/socket';
};

// Provides the base URL for API calls, handling local dev proxy and production environments.
export const getApiBaseUrl = (): string => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
        // In development, all API calls are proxied by Vite, so we use a relative path.
        return '';
    }
    // In production, we point directly to the Render backend.
    return 'https://sabzimate-server.onrender.com';
};