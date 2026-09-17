/**
 * MOSA Smart Location Quality, Completeness Scoring & Geodesic Intelligence
 */

export interface LocationCompletenessResult {
  score: number; // 0 to 100
  percentage: number;
  level: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  breakdown: {
    hasCoordinates: boolean; // +25%
    isGpsVerified: boolean;  // +25%
    hasLandmark: boolean;    // +25%
    hasDescription: boolean; // +25%
  };
  missingRecommendations: string[];
}

/**
 * Calculates geodesic distance between two coordinate pairs using the Haversine formula.
 * @returns distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Detect near-duplicates: checks if an existing business is within thresholdMeters (default 25m)
 * and has a matching or very similar name.
 */
export function checkNearDuplicates(
  target: { lat: number; lng: number; name: string; category?: string },
  existingBusinesses: Array<{ id: string; name: string; latitude: number; longitude: number; category?: string }>,
  thresholdMeters = 25
): { isNearDuplicate: boolean; matchedBusiness?: (typeof existingBusinesses)[0]; distanceMeters?: number } {
  if (!target.lat || !target.lng || !target.name) {
    return { isNearDuplicate: false };
  }

  const cleanTargetName = target.name.trim().toLowerCase();

  for (const b of existingBusinesses) {
    if (typeof b.latitude !== "number" || typeof b.longitude !== "number") continue;

    const distance = haversineDistance(target.lat, target.lng, b.latitude, b.longitude);

    if (distance <= thresholdMeters) {
      const cleanExistingName = b.name.trim().toLowerCase();
      // Check if names share significant tokens or are very similar
      const isNameSimilar =
        cleanExistingName === cleanTargetName ||
        cleanExistingName.includes(cleanTargetName) ||
        cleanTargetName.includes(cleanExistingName) ||
        (target.category && b.category && target.category === b.category && distance < 15);

      if (isNameSimilar) {
        return {
          isNearDuplicate: true,
          matchedBusiness: b,
          distanceMeters: distance,
        };
      }
    }
  }

  return { isNearDuplicate: false };
}

/**
 * Calculates a comprehensive location completeness score (0-100%)
 */
export function calculateLocationCompleteness(business: {
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  locationSource?: string | null;
  locationVerificationStatus?: string | null;
  nearestLandmark?: string | null;
  locationDescription?: string | null;
  addressNote?: string | null;
}): LocationCompletenessResult {
  const hasCoordinates =
    typeof business.latitude === "number" &&
    typeof business.longitude === "number" &&
    business.latitude >= -2.9 &&
    business.latitude <= -1.0 &&
    business.longitude >= 28.8 &&
    business.longitude <= 30.9;

  const isGpsVerified = Boolean(
    (business.locationSource === "GPS_DEVICE" || business.locationSource === "AGENT_PIN") &&
    (business.locationVerificationStatus === "AGENT_CAPTURED" ||
     business.locationVerificationStatus === "AGENT_VERIFIED" ||
     business.locationVerificationStatus === "COMMUNITY_VERIFIED" ||
     business.locationVerificationStatus === "BUSINESS_CONFIRMED")
  );

  const hasLandmark = Boolean(
    business.nearestLandmark && business.nearestLandmark.trim().length >= 3
  );

  const hasDescription = Boolean(
    (business.locationDescription && business.locationDescription.trim().length >= 8) ||
    (business.addressNote && business.addressNote.trim().length >= 8)
  );

  let score = 0;
  if (hasCoordinates) score += 25;
  if (isGpsVerified) score += 25;
  if (hasLandmark) score += 25;
  if (hasDescription) score += 25;

  const missingRecommendations: string[] = [];
  if (!hasCoordinates) missingRecommendations.push("Capture or set exact GPS coordinates.");
  if (!isGpsVerified) missingRecommendations.push("Audit coordinates on-site with certified agent GPS.");
  if (!hasLandmark) missingRecommendations.push("Specify nearest recognized landmark (e.g. MINAGRI Gate).");
  if (!hasDescription) missingRecommendations.push("Add human directions (e.g. 'Opposite yellow MTN kiosk').");

  let level: LocationCompletenessResult["level"] = "POOR";
  if (score === 100) level = "EXCELLENT";
  else if (score >= 75) level = "GOOD";
  else if (score >= 50) level = "FAIR";

  return {
    score,
    percentage: score,
    level,
    breakdown: {
      hasCoordinates,
      isGpsVerified,
      hasLandmark,
      hasDescription,
    },
    missingRecommendations,
  };
}

/**
 * Builds Google Maps navigation URL from MOSA authoritative coordinates
 */
export function getGoogleMapsDirectionsUrl(
  latOrTarget: number | { lat: number; lng: number; name?: string },
  optionalLng?: number
): string {
  let lat = 0;
  let lng = 0;
  let name: string | undefined;

  if (typeof latOrTarget === "object" && latOrTarget !== null) {
    lat = latOrTarget.lat;
    lng = latOrTarget.lng;
    name = latOrTarget.name;
  } else if (typeof latOrTarget === "number") {
    lat = latOrTarget;
    lng = optionalLng ?? 0;
  }

  const destination = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${
    name ? `&destination_place_id=${encodeURIComponent(name)}` : ""
  }`;
}
