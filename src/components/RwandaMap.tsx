import { useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import villages from "../data/rwanda_villages_simplified.json";
import type { Feature, FeatureCollection, GeoJsonProperties } from "geojson";
import type { Path } from "leaflet";

export default function RwandaMap() {
  const [selected, setSelected] = useState<GeoJsonProperties | null>(null);
  const lastSelectedLayer = useRef<Path | null>(null);

  const getLabel = (p: GeoJsonProperties | null | undefined, key: string) => {
    const v = p && typeof p === "object" ? (p as Record<string, unknown>)[key] : undefined;
    if (v === null || v === undefined || v === "") return "Unknown";
    return String(v);
  };

  const featureId = (p: GeoJsonProperties | null | undefined) => {
    const safe = (k: string) => getLabel(p, k);
    return [safe("ID_0"), safe("ID_1"), safe("ID_2"), safe("ID_3"), safe("ID_4"), safe("ID_5")].join("-");
  };

  const baseStyle = { weight: 0.4, fillOpacity: 0.3 };
  const selectedStyle = { weight: 2, fillOpacity: 0.45 };

  const onEachFeature = (feature: Feature, layer: Path) => {
    const p = feature.properties;

    // Your dataset uses NAME_0..NAME_5 (not ADM*_EN)
    const popupHtml = `
      <strong>Village:</strong> ${getLabel(p, "NAME_5")}<br/>
      <strong>Cell:</strong> ${getLabel(p, "NAME_4")}<br/>
      <strong>Sector:</strong> ${getLabel(p, "NAME_3")}<br/>
      <strong>District:</strong> ${getLabel(p, "NAME_2")}<br/>
      <strong>Province:</strong> ${getLabel(p, "NAME_1")}
    `;

    layer.bindPopup(popupHtml);

    layer.on("click", () => {
      if (lastSelectedLayer.current && lastSelectedLayer.current !== layer) {
        lastSelectedLayer.current.setStyle(baseStyle);
      }
      layer.setStyle(selectedStyle);
      lastSelectedLayer.current = layer;

      setSelected(p ?? null);
      layer.openPopup();
    });
  };

  return (
    <MapContainer
      center={[-1.94, 29.87]}
      zoom={9}
      style={{ height: "100vh", width: "100%" }}
    >
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
          return isSelected ? selectedStyle : baseStyle;
        }}
      />
    </MapContainer>
  );
}
