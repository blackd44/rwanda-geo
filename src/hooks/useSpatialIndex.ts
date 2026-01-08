import { useCallback, useMemo } from "react";
import * as L from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";

/**
 * Custom hook that provides spatial indexing and point-in-polygon query functionality
 * Uses an adaptive spatial grid index for fast lookups
 */
export function useSpatialIndex(features: Feature[]) {
  // Point-in-polygon test using ray-casting algorithm for a single ring
  const isPointInRing = useCallback(
    (point: [number, number], ring: number[][]): boolean => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0],
          yi = ring[i][1];
        const xj = ring[j][0],
          yj = ring[j][1];
        const intersect =
          yi > point[1] !== yj > point[1] &&
          point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    },
    [],
  );

  // Point-in-polygon test for GeoJSON Polygon (handles exterior ring and holes)
  const isPointInPolygonCoords = useCallback(
    (point: [number, number], coordinates: number[][][]): boolean => {
      if (coordinates.length === 0) return false;
      const exteriorRing = coordinates[0];
      if (!isPointInRing(point, exteriorRing)) return false;

      // Check if point is in any hole (if so, it's outside)
      for (let i = 1; i < coordinates.length; i++) {
        if (isPointInRing(point, coordinates[i])) return false;
      }
      return true;
    },
    [isPointInRing],
  );

  // Adaptive spatial grid index for fast point-in-polygon queries
  // Grid size adapts to data density for optimal performance
  const spatialGridIndex = useMemo(() => {
    const n = features.length;

    // Target: 3-5 features per cell for optimal balance
    const targetFeaturesPerCell = 4;
    const optimalGridSize = Math.ceil(Math.sqrt(n / targetFeaturesPerCell));
    // Clamp between reasonable bounds (30-80 cells for performance/memory balance)
    const gridSize = Math.max(30, Math.min(80, optimalGridSize));

    // Use numeric keys instead of strings (faster lookups)
    const grid: Map<number, number[]> = new Map();
    const key = (row: number, col: number) => row * gridSize + col;

    // Pre-calculate bounds for all features (avoid recreating layers)
    const featureBounds = features.map((feature) => {
      const layer = L.geoJSON(feature as unknown as GeoJsonObject);
      return layer.getBounds();
    });

    // Calculate overall bounds from pre-calculated bounds
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;

    featureBounds.forEach((bounds) => {
      minLat = Math.min(minLat, bounds.getSouth());
      maxLat = Math.max(maxLat, bounds.getNorth());
      minLng = Math.min(minLng, bounds.getWest());
      maxLng = Math.max(maxLng, bounds.getEast());
    });

    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const cellLatSize = latRange / gridSize;
    const cellLngSize = lngRange / gridSize;

    // Index each feature using pre-calculated bounds
    features.forEach((_feature, index) => {
      const bounds = featureBounds[index];

      // Find grid cells this feature's bounds overlap with
      const south = Math.floor((bounds.getSouth() - minLat) / cellLatSize);
      const north = Math.ceil((bounds.getNorth() - minLat) / cellLatSize);
      const west = Math.floor((bounds.getWest() - minLng) / cellLngSize);
      const east = Math.ceil((bounds.getEast() - minLng) / cellLngSize);

      for (let row = Math.max(0, south); row <= Math.min(gridSize - 1, north); row++) {
        for (let col = Math.max(0, west); col <= Math.min(gridSize - 1, east); col++) {
          const k = key(row, col);
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k)!.push(index);
        }
      }
    });

    return {
      grid,
      gridSize,
      minLat,
      maxLat,
      minLng,
      maxLng,
      cellLatSize,
      cellLngSize,
      key,
    };
  }, [features]);

  // Get village feature at a given lat/lng coordinate using adaptive spatial grid index + accurate point-in-polygon test
  const getVillageAtLatLng = useCallback(
    (latlng: L.LatLng): Feature | null => {
      const point = L.latLng(latlng);
      const pointCoords: [number, number] = [point.lng, point.lat]; // GeoJSON uses [lng, lat]

      // Find which grid cell the point is in
      const {
        grid,
        gridSize,
        minLat,
        maxLat,
        minLng,
        maxLng,
        cellLatSize,
        cellLngSize,
        key,
      } = spatialGridIndex;

      // Quick bounds check: if point is outside the bounds of all features, return null immediately
      if (
        point.lat < minLat ||
        point.lat > maxLat ||
        point.lng < minLng ||
        point.lng > maxLng
      )
        return null;

      const row = Math.floor((point.lat - minLat) / cellLatSize);
      const col = Math.floor((point.lng - minLng) / cellLngSize);

      // Clamp to valid grid range
      const validRow = Math.max(0, Math.min(gridSize - 1, row));
      const validCol = Math.max(0, Math.min(gridSize - 1, col));
      const gridKey = key(validRow, validCol);

      // Get candidate features from this grid cell (using numeric key for faster lookup)
      const candidateIndices = grid.get(gridKey) || [];

      // Check candidates with accurate point-in-polygon test
      for (const index of candidateIndices) {
        const feature = features[index];
        if (!feature) continue;

        // Quick bounds check first
        const layer = L.geoJSON(feature as unknown as GeoJsonObject);
        if (!layer.getBounds().contains(point)) continue;

        // Accurate point-in-polygon test
        const geometry = feature.geometry;
        if (geometry.type === "Polygon") {
          if (isPointInPolygonCoords(pointCoords, geometry.coordinates)) return feature;
        } else if (geometry.type === "MultiPolygon") {
          for (const polygon of geometry.coordinates)
            if (isPointInPolygonCoords(pointCoords, polygon)) return feature;
        }
      }
      return null;
    },
    [features, isPointInPolygonCoords, spatialGridIndex],
  );

  return { getVillageAtLatLng };
}
