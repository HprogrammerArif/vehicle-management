/**
 * Calculate distance between two GPS coordinates using Haversine formula (in kilometers)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Fuel Anomaly Detection
 * @param deltaKm Distance traveled since last refuel or start
 * @param fuelAdded Liters of fuel added
 * @param ratedEfficiency Vehicle rated km/L
 * @returns { isAnomaly: boolean, actualRate: number, deviationPct: number }
 */
export function checkFuelAnomaly(
  deltaKm: number,
  fuelAdded: number,
  ratedEfficiency: number
): { isAnomaly: boolean; actualRate: number; deviationPct: number } {
  if (fuelAdded <= 0 || deltaKm <= 0) {
    return { isAnomaly: false, actualRate: ratedEfficiency, deviationPct: 0 };
  }

  // actual km per liter
  const actualRate = Math.round((deltaKm / fuelAdded) * 100) / 100;
  // deviation from rated efficiency
  const deviationPct = Math.round(
    (Math.abs(actualRate - ratedEfficiency) / ratedEfficiency) * 100
  );

  // If actual efficiency is significantly worse (> 25% lower km/L) or suspiciously high (> 35%), flag anomaly
  const isAnomaly = actualRate < ratedEfficiency * 0.75 || actualRate > ratedEfficiency * 1.35;

  return { isAnomaly, actualRate, deviationPct };
}
