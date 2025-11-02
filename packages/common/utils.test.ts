import { describe, it, expect } from 'vitest';
import { calculateDistance } from './utils';

describe('calculateDistance', () => {
  it('should calculate the distance between two points correctly', () => {
    // Coordinates for Ujjain, Madhya Pradesh
    const lat1 = 23.1793;
    const lon1 = 75.7849;

    // Coordinates for Indore, Madhya Pradesh
    const lat2 = 22.7196;
    const lon2 = 75.8577;

    // The approximate distance is ~52.6 km
    const distance = calculateDistance(lat1, lon1, lat2, lon2);

    // We use toBeCloseTo for floating-point numbers to avoid precision issues.
    // This expects the result to be 52.6 +/- 0.1
    expect(distance).toBeCloseTo(52.6, 1);
  });

  it('should return 0 for the same point', () => {
    const lat1 = 23.1793;
    const lon1 = 75.7849;
    const distance = calculateDistance(lat1, lon1, lat1, lon1);
    expect(distance).toBe(0);
  });
});
