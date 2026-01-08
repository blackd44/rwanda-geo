/**
 * Parses a coordinate string in various formats and returns decimal degrees
 * Supports:
 * - Decimal degrees: "-1.94, 29.87" or "-1.94,29.87" or "1.94, 29.87"
 * - DMS format: "1°54'35.2"S 30°03'44.9"E" or "1°54'35.2\"S 30°03'44.9\"E"
 * - DMS with spaces: "1° 54' 35.2\"S 30° 03' 44.9\"E"
 * @param input - The coordinate string to parse
 * @returns Object with lat and lng in decimal degrees, or null if parsing fails
 */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try decimal degrees format first (most common): "lat, lng" or "lat,lng"
  const decimalMatch = trimmed.match(/^(-?\d+\.?\d*)\s*[,;]\s*(-?\d+\.?\d*)$/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]!);
    const lng = parseFloat(decimalMatch[2]!);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }

  // Try DMS format: "1°54'35.2"S 30°03'44.9"E"
  // Match patterns like: degrees°minutes'seconds"[NSEW] degrees°minutes'seconds"[NSEW]
  const dmsPattern =
    /(-?\d+)[°\s]+(\d+)['\s]+(\d+\.?\d*)[\"\s]*([NSEW])\s+(-?\d+)[°\s]+(\d+)['\s]+(\d+\.?\d*)[\"\s]*([NSEW])/i;
  const dmsMatch = trimmed.match(dmsPattern);
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]!);
    const latMin = parseFloat(dmsMatch[2]!);
    const latSec = parseFloat(dmsMatch[3]!);
    const latDir = dmsMatch[4]!.toUpperCase();
    const lngDeg = parseFloat(dmsMatch[5]!);
    const lngMin = parseFloat(dmsMatch[6]!);
    const lngSec = parseFloat(dmsMatch[7]!);
    const lngDir = dmsMatch[8]!.toUpperCase();

    if (
      !isNaN(latDeg) &&
      !isNaN(latMin) &&
      !isNaN(latSec) &&
      !isNaN(lngDeg) &&
      !isNaN(lngMin) &&
      !isNaN(lngSec)
    ) {
      let lat = latDeg + latMin / 60 + latSec / 3600;
      let lng = lngDeg + lngMin / 60 + lngSec / 3600;

      if (latDir === "S") lat = -lat;
      if (lngDir === "W") lng = -lng;

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  // Try DMS without quotes: "1°54'35.2S 30°03'44.9E"
  const dmsNoQuotesPattern =
    /(-?\d+)[°\s]+(\d+)['\s]+(\d+\.?\d*)([NSEW])\s+(-?\d+)[°\s]+(\d+)['\s]+(\d+\.?\d*)([NSEW])/i;
  const dmsNoQuotesMatch = trimmed.match(dmsNoQuotesPattern);
  if (dmsNoQuotesMatch) {
    const latDeg = parseFloat(dmsNoQuotesMatch[1]!);
    const latMin = parseFloat(dmsNoQuotesMatch[2]!);
    const latSec = parseFloat(dmsNoQuotesMatch[3]!);
    const latDir = dmsNoQuotesMatch[4]!.toUpperCase();
    const lngDeg = parseFloat(dmsNoQuotesMatch[5]!);
    const lngMin = parseFloat(dmsNoQuotesMatch[6]!);
    const lngSec = parseFloat(dmsNoQuotesMatch[7]!);
    const lngDir = dmsNoQuotesMatch[8]!.toUpperCase();

    if (
      !isNaN(latDeg) &&
      !isNaN(latMin) &&
      !isNaN(latSec) &&
      !isNaN(lngDeg) &&
      !isNaN(lngMin) &&
      !isNaN(lngSec)
    ) {
      let lat = latDeg + latMin / 60 + latSec / 3600;
      let lng = lngDeg + lngMin / 60 + lngSec / 3600;

      if (latDir === "S") lat = -lat;
      if (lngDir === "W") lng = -lng;

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  return null;
}
