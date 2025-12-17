import { useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from "react-leaflet";
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

export default function RwandaMap() {
  const [selected, setSelected] = useState<GeoJsonProperties | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [highlightedRegion, setHighlightedRegion] = useState<SearchItem | null>(null);
  const lastSelectedLayer = useRef<Path | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const boundsCache = useRef<Map<number, LatLngBounds>>(new Map());
  const selectedRef = useRef<GeoJsonProperties | null>(null);
  const highlightedRegionRef = useRef<SearchItem | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    highlightedRegionRef.current = highlightedRegion;
  }, [highlightedRegion]);

  const getLabel = (p: GeoJsonProperties | null | undefined, key: string) => {
    const v =
      p && typeof p === "object" ? (p as Record<string, unknown>)[key] : undefined;
    if (v === null || v === undefined || v === "") return "Unknown";
    return String(v);
  };

  const featureId = (p: GeoJsonProperties | null | undefined) => {
    const safe = (k: string) => getLabel(p, k);
    return [
      safe("ID_0"),
      safe("ID_1"),
      safe("ID_2"),
      safe("ID_3"),
      safe("ID_4"),
      safe("ID_5"),
    ].join("-");
  };

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
    weight: 2,
    fillOpacity: 0.45,
  };

  const featureCollection = villages as FeatureCollection;
  const features = useMemo(
    () => (featureCollection.features ?? []) as Feature[],
    [featureCollection.features],
  );

  const clearSelection = () => {
    if (lastSelectedLayer.current) {
      lastSelectedLayer.current.setStyle(baseStyle);
      lastSelectedLayer.current = null;
    }
    setSelected(null);
  };

  const clearRegionHighlight = () => {
    setHighlightedIds([]);
    setHighlightedRegion(null);
  };

  const highlightedIdSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);

  const idsFromIndices = (indices: number[]) =>
    indices
      .map((idx) => features[idx]?.properties)
      .filter(Boolean)
      .map((p) => featureId(p as GeoJsonProperties));

  const fitToIndices = (indices: number[]) => {
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

    if (bounds?.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [24, 24] });
    }
  };

  const onPick = (item: SearchItem) => {
    // Clear existing single-feature highlight when jumping to a region
    clearSelection();
    fitToIndices(item.indices);

    if (item.level === "Village") {
      // Select ONE village (and clear any region highlight)
      clearRegionHighlight();
      const first = features[item.indices[0]];
      setSelected(first?.properties ?? null);
      return;
    }

    // Province/District/Sector/Cell: highlight ALL villages in that area (no "selected")
    setSelected(null);
    setHighlightedRegion(item);
    setHighlightedIds(idsFromIndices(item.indices));
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

  const onEachFeature = (feature: Feature, layer: Path) => {
    const p = feature.properties;

    const handleClick = () => {
      const clickedId = featureId(p);
      const currentId = selectedRef.current ? featureId(selectedRef.current) : null;
      const isToggleOff = currentId && clickedId === currentId;

      // Toggle off if clicking the same feature again
      if (isToggleOff) {
        layer.setStyle(baseStyle);
        if (lastSelectedLayer.current === layer) lastSelectedLayer.current = null;
        setSelected(null);
        return;
      }

      if (lastSelectedLayer.current && lastSelectedLayer.current !== layer)
        lastSelectedLayer.current.setStyle(baseStyle);

      layer.setStyle(selectedStyle);
      lastSelectedLayer.current = layer;
      setSelected(p ?? null);
    };

    layer.on("click", () => {
      handleClick();
    });

    layer.on("dblclick", () => {
      clearRegionHighlight();

      handleClick();
    });
  };

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

        <GeoJSON
          data={villages as FeatureCollection}
          onEachFeature={onEachFeature}
          style={(feature) => {
            const p = (feature as Feature).properties;
            const isSelected = selected ? featureId(p) === featureId(selected) : false;
            if (isSelected) return selectedStyle;
            if (highlightedIdSet.has(featureId(p))) return highlightedStyle;
            return baseStyle;
          }}
        />
      </MapContainer>

      <div className="absolute top-4 right-4 z-1000 flex flex-col gap-4">
        {selected && (
          <SelectedCard
            selected={selected}
            lastSelectedLayerRef={lastSelectedLayer}
            baseStyle={baseStyle}
            setSelected={setSelected}
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
    </div>
  );
}
