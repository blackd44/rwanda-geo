/**
 * Converts decimal degrees to Degrees Minutes Seconds (DMS) format
 * @param decimalDegrees - The decimal degree value
 * @param isLatitude - true for latitude (N/S), false for longitude (E/W)
 * @returns Formatted string like "1°54'35.2"S" or "30°03'44.9"E"
 */
export function decimalToDMS(decimalDegrees: number, isLatitude: boolean): string {
  const abs = Math.abs(decimalDegrees);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  const direction = isLatitude
    ? decimalDegrees >= 0
      ? "N"
      : "S"
    : decimalDegrees >= 0
      ? "E"
      : "W";

  return `${degrees}°${minutes.toString().padStart(2, "0")}'${seconds.toFixed(1)}"${direction}`;
}

/**
 * Converts a LatLng to DMS format string
 * @param lat - Latitude in decimal degrees
 * @param lng - Longitude in decimal degrees
 * @returns Formatted string like "1°54'35.2"S 30°03'44.9"E"
 */
export function latLngToDMS(lat: number, lng: number): string {
  return `${decimalToDMS(lat, true)} ${decimalToDMS(lng, false)}`;
}
