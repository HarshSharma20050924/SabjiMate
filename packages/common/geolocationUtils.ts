// This file provides map positioning utilities.
// The geocoding logic has been moved to a real AI service on the backend.


// This defines the geographical boundaries of our map placeholder, centered on Ujjain.
// Any coordinate outside this box will be clamped to the edge.
export const MAP_BOUNDS = {
    lat_min: 23.0,  // Ujjain latitude is ~23.17
    lat_max: 23.4,
    lon_min: 75.6,  // Ujjain longitude is ~75.78
    lon_max: 76.0,
};

// This function converts a lat/lon coordinate into a {top, left} percentage
// which can be used for absolute positioning on the map div.
export const convertCoordsToPercent = (lat: number, lon: number): { top: number; left: number } => {
    // Clamp values to be within the bounds to prevent icons from going off-map
    const clampedLat = Math.max(MAP_BOUNDS.lat_min, Math.min(MAP_BOUNDS.lat_max, lat));
    const clampedLon = Math.max(MAP_BOUNDS.lon_min, Math.min(MAP_BOUNDS.lon_max, lon));

    const latRange = MAP_BOUNDS.lat_max - MAP_BOUNDS.lat_min;
    const lonRange = MAP_BOUNDS.lon_max - MAP_BOUNDS.lon_min;

    const left = ((clampedLon - MAP_BOUNDS.lon_min) / lonRange) * 100;
    // We invert the latitude calculation because screen 'top: 0%' is at the top,
    // whereas higher latitude is geographically further north (up).
    const top = 100 - (((clampedLat - MAP_BOUNDS.lat_min) / latRange) * 100);

    return { top, left };
};