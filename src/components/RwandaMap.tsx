import { useCallback, useEffect, useMemo, useRef } from "react";
import { GeoJSON, MapContainer, Marker, TileLayer, ZoomControl } from "react-leaflet";
import villages from "../data/rwanda_villages_simplified.json";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  GeoJsonObject,
} from "geojson";
import * as L from "leaflet";
import type { LatLngBounds, Map as LeafletMap, Path } from "leaflet";
import type { SearchItem } from "@/components/shared/location-search";
import LocationSearch from "@/components/shared/location-search";
import SelectedCard from "@/components/shared/selected";
import RegionStatsCard from "@/components/shared/region-stats";
import { useUrlParam } from "@/hooks/useUrlParam";
import { buildSearchIndexMap } from "@/lib/search-index";
import { MapClickHandler } from "./handlers/MapClickHandler";

function getLabel(p: GeoJsonProperties | null | undefined, key: string) {
  const v = p && typeof p === "object" ? (p as Record<string, unknown>)[key] : undefined;
  if (v === null || v === undefined || v === "") return "Unknown";
  return String(v);
}

function featureId(p: GeoJsonProperties | null | undefined) {
  const safe = (k: string) => getLabel(p, k);
  return [
    safe("ID_0"),
    safe("ID_1"),
    safe("ID_2"),
    safe("ID_3"),
    safe("ID_4"),
    safe("ID_5"),
  ].join("-");
}

export default function RwandaMap() {
  const [selectedId, setSelectedId] = useUrlParam<string>("selected", "", 0);
  const [highlightedId, setHighlightedId] = useUrlParam<string>("highlight", "", 0);
  const [pinnedLocation, setPinnedLocation] = useUrlParam<string>("pinned", "", 0);

  // Parse pinned location from URL (format: "lat,lon")
  const pinnedLatLng = useMemo(() => {
    if (!pinnedLocation) return null;

    const parts = pinnedLocation.split(",");
    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) return null;

    return L.latLng(lat, lon);
  }, [pinnedLocation]);

  const lastSelectedLayer = useRef<Path | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const boundsCache = useRef<Map<number, LatLngBounds>>(new Map());
  const selectedRef = useRef<GeoJsonProperties | null>(null);
  const highlightedRegionRef = useRef<SearchItem | null>(null);
  const hasInitialZoomed = useRef(false);

  const baseStyle = {
    color: "#64748b",
    fillColor: "#94a3b8",
    weight: 0.4,
    fillOpacity: 0.1,
  };
  const selectedStyle = {
    color: "#1d4ed8",
    fillColor: "#3b82f6",
    weight: 2,
    fillOpacity: 0.45,
  };
  const highlightedStyle = {
    color: "#b45309",
    fillColor: "#f59e0b",
    weight: 0.7,
    fillOpacity: 0.45,
  };

  const featureCollection = villages as FeatureCollection;
  const features = useMemo(
    () => (featureCollection.features ?? []) as Feature[],
    [featureCollection.features],
  );

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

  // Build search index to reconstruct SearchItems from IDs
  const searchIndexMap = useMemo(() => buildSearchIndexMap(features), [features]);

  const idsFromIndices = useCallback(
    (indices: number[]) =>
      indices
        .map((idx) => features[idx]?.properties)
        .filter(Boolean)
        .map((p) => featureId(p as GeoJsonProperties)),
    [features],
  );

  const fitToIndices = useCallback(
    (indices: number[]) => {
      console.log("indices", indices);
      if (!mapRef.current) return;
      let bounds: LatLngBounds | null = null;

      for (const idx of indices) {
        let b = boundsCache.current.get(idx);
        if (!b) {
          b = L.geoJSON(features[idx] as unknown as GeoJsonObject).getBounds();
          boundsCache.current.set(idx, b);
        }
        if (!b?.isValid()) continue;
        bounds = bounds ? bounds.extend(b) : b;
      }

      if (bounds?.isValid()) mapRef.current.fitBounds(bounds, { padding: [24, 24] });
    },
    [features],
  );

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

  const getVillageAtLatLng = useCallback(
    (latlng: L.LatLng): Feature | null => {
      const point = L.latLng(latlng);
      const pointCoords: [number, number] = [point.lng, point.lat]; // GeoJSON uses [lng, lat]

      // Find which grid cell the point is in
      const { grid, gridSize, minLat, minLng, cellLatSize, cellLngSize, key } =
        spatialGridIndex;
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

  // Reconstruct selected from URL param
  const selected = useMemo(() => {
    if (!selectedId) return null;
    const feature = features.find((f) => featureId(f.properties) === selectedId);
    return feature?.properties ?? null;
  }, [selectedId, features]);

  // Reconstruct highlighted region from URL param
  const highlightedRegion = useMemo(() => {
    if (!highlightedId) return null;
    return searchIndexMap.get(highlightedId) ?? null;
  }, [highlightedId, searchIndexMap]);

  const highlightedIds = useMemo(() => {
    if (!highlightedRegion) return [];
    return idsFromIndices(highlightedRegion.indices);
  }, [highlightedRegion, idsFromIndices]);

  // Zoom to Rwanda bounds (default)
  const zoomToRwanda = useCallback(() => {
    if (!mapRef.current) return;
    // Rwanda approximate bounds
    const rwandaBounds: L.LatLngBoundsExpression = [
      [-2.84, 28.86], // Southwest
      [-1.05, 30.9], // Northeast
    ];
    mapRef.current.fitBounds(rwandaBounds, { padding: [24, 24] });
  }, []);

  // Zoom on initial page load only: selected > highlighted > Rwanda
  useEffect(() => {
    if (hasInitialZoomed.current || features.length === 0) return;

    // Wait for map to be ready
    const checkAndZoom = () => {
      if (!mapRef.current) {
        // Retry after a short delay if map isn't ready
        setTimeout(checkAndZoom, 50);
        return;
      }

      // Find selected feature index
      let selectedFeatureIndex: number | null = null;
      if (selected)
        selectedFeatureIndex = features.findIndex(
          (f) => featureId(f.properties) === featureId(selected),
        );

      // Zoom based on priority: selected > highlighted > Rwanda
      if (selectedFeatureIndex !== null && selectedFeatureIndex >= 0)
        // Zoom to selected feature
        fitToIndices([selectedFeatureIndex]);
      else if (highlightedRegion)
        // Zoom to highlighted region
        fitToIndices(highlightedRegion.indices);
      else
        // Zoom to Rwanda (default)
        zoomToRwanda();

      hasInitialZoomed.current = true;
    };

    // Start checking after a short delay to ensure map is initialized
    const timeoutId = setTimeout(checkAndZoom, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features.length, selected, highlightedRegion]); // Trigger when features are loaded and state is ready

  // Clear invalid URL params
  useEffect(() => {
    if (selectedId && !selected) setSelectedId("" as typeof selectedId);
  }, [selectedId, selected, setSelectedId]);

  useEffect(() => {
    if (highlightedId && !highlightedRegion) setHighlightedId("");
  }, [highlightedId, highlightedRegion, setHighlightedId]);

  const clearSelection = () => {
    if (lastSelectedLayer.current) {
      lastSelectedLayer.current.setStyle(baseStyle);
      lastSelectedLayer.current = null;
    }
    setSelectedId("" as typeof selectedId);
    setPinnedLocation("");
  };

  const clearRegionHighlight = useCallback(() => {
    setHighlightedId("");
  }, [setHighlightedId]);

  const highlightedIdSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    highlightedRegionRef.current = highlightedRegion;
  }, [highlightedRegion]);

  const handleMapClick = useCallback(
    (latlng: L.LatLng) => {
      // Set pin location to the cursor position
      setPinnedLocation(`${latlng.lat},${latlng.lng}`);

      // Find and select the village at this location
      const feature = getVillageAtLatLng(latlng);
      if (feature) {
        setSelectedId(featureId(feature.properties));
        clearRegionHighlight();
      } else {
        // If no village found, clear selection but keep pin
        setSelectedId("");
      }
    },
    [getVillageAtLatLng, setPinnedLocation, setSelectedId, clearRegionHighlight],
  );

  const onPick = (item: SearchItem) => {
    // Clear existing single-feature highlight when jumping to a region
    clearSelection();
    fitToIndices(item.indices);

    if (item.level === "Village") {
      // Select ONE village (and clear any region highlight)
      clearRegionHighlight();
      const first = features[item.indices[0]];
      const id = featureId(first?.properties);

      if (first?.properties) setSelectedId(id);

      return;
    }

    // Province/District/Sector/Cell: highlight ALL villages in that area (no "selected")
    setSelectedId("" as typeof selectedId);
    setHighlightedId(item.id);
  };

  const regionStats = useMemo(() => {
    if (!highlightedRegion) return null;
    const uniqueIndices = Array.from(new Set(highlightedRegion.indices));
    const districts = new Set<string>();
    const sectors = new Set<string>();
    const cells = new Set<string>();

    for (const idx of uniqueIndices) {
      const p = features[idx]?.properties as GeoJsonProperties | null | undefined;
      districts.add(getLabel(p, "NAME_2"));
      sectors.add(getLabel(p, "NAME_3"));
      cells.add(getLabel(p, "NAME_4"));
    }

    return {
      villages: uniqueIndices.length,
      districts: districts.size,
      sectors: sectors.size,
      cells: cells.size,
    };
  }, [features, highlightedRegion]);

  return (
    <div className="relative h-screen w-full">
      <LocationSearch features={features} onPick={onPick} />

      <MapContainer
        center={[-1.94, 29.87]}
        zoom={9}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={handleMapClick} />

        <GeoJSON
          data={villages as FeatureCollection}
          style={(feature) => {
            const p = (feature as Feature).properties;
            const isSelected = selected ? featureId(p) === featureId(selected) : false;
            if (isSelected) return selectedStyle;
            if (highlightedIdSet.has(featureId(p))) return highlightedStyle;
            return baseStyle;
          }}
        />

        {pinnedLatLng && (
          <Marker
            position={pinnedLatLng}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const latlng = e.target.getLatLng();
                setPinnedLocation(`${latlng.lat},${latlng.lng}`);
                const feature = getVillageAtLatLng(latlng);
                if (feature) setSelectedId(featureId(feature.properties));
              },
              click: (e) => {
                const latlng = e.target.getLatLng();
                const feature = getVillageAtLatLng(latlng);

                console.log("feature", feature?.properties);
                fitToIndices([(feature?.properties?.ID_5 ?? 1) - 1]);
              },
            }}
          />
        )}
      </MapContainer>

      <div className="absolute top-4 right-4 z-1000 flex flex-col gap-2 max-[52rem]:top-16 max-md:text-xs">
        {selected && (
          <SelectedCard
            selected={selected}
            lastSelectedLayerRef={lastSelectedLayer}
            baseStyle={baseStyle}
            setSelected={(value) => {
              if (value) {
                console.log("value", value);
                setSelectedId(featureId(value) as typeof selectedId);
              } else {
                setSelectedId("");
              }
            }}
          />
        )}

        {highlightedRegion && regionStats && (
          <RegionStatsCard
            region={highlightedRegion}
            stats={regionStats}
            onClose={clearRegionHighlight}
          />
        )}
      </div>

      {/* Floating Footer */}
      <div className="pointer-events-none absolute bottom-0 z-1000 w-full">
        <div className="pointer-events-auto mx-auto flex w-fit flex-wrap items-center justify-center gap-1 rounded-lg rounded-b-none border border-white/10 bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-400 backdrop-blur md:gap-2 md:px-4 md:py-1.5 md:text-xs">
          <span>© 2025</span>
          <a
            href="https://blackd44.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-300 transition-colors hover:text-orange-200"
          >
            blackd44
          </a>
          <span>•</span>
          <span>
            {/* <a
              href="https://geoportal.mininfra.gov.rw"
              target="_blank"
              rel="noopener noreferrer"
            > */}
            Data source: MININFRA Geoportal
            {/* </a> */}
          </span>
        </div>
      </div>
    </div>
  );
}
