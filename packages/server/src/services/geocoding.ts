import logger from '../logger';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
let lastApiCall = 0;

// Helper to respect Nominatim's 1 request/second policy
async function rateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    if (timeSinceLastCall < 1100) { // 1.1 seconds for safety
        await new Promise(resolve => setTimeout(resolve, 1100 - timeSinceLastCall));
    }
    lastApiCall = Date.now();
}

interface AddressDetails {
    address: string;
    city: string;
    state: string;
}

// Converts coordinates (lat/lon) to a human-readable address
export async function reverseGeocode(lat: number, lon: number): Promise<AddressDetails | null> {
    await rateLimit();
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'SabziMateApp/1.0' }
        });
        if (!response.ok) {
            throw new Error(`Nominatim API failed with status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        const address = data.address;
        return {
            address: data.display_name || '',
            city: address.city || address.town || address.village || '',
            state: address.state || ''
        };
    } catch (error) {
        logger.error(error, 'Reverse geocoding with Nominatim failed');
        return null;
    }
}

// Converts a structured address to coordinates (lat/lon)
export async function forwardGeocode(address: string, city: string, state: string): Promise<{ lat: number; lon: number } | null> {
    await rateLimit();
    const query = encodeURIComponent(`${address}, ${city}, ${state}`);
    const url = `${NOMINATIM_BASE_URL}/search?q=${query}&format=json&countrycodes=in&limit=1`;
    
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'SabziMateApp/1.0' }
        });
        if (!response.ok) {
            throw new Error(`Nominatim API failed with status: ${response.status}`);
        }
        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon)
            };
        }
        return null;
    } catch (error) {
        logger.error(error, 'Forward geocoding with Nominatim failed');
        return null;
    }
}
