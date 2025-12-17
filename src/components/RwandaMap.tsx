import { useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import villages from "../data/rwanda_villages_simplified.json";
import type { Feature, FeatureCollection, GeoJsonProperties } from "geojson";
import type { Path } from "leaflet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RwandaMap() {
  const [selected, setSelected] = useState<GeoJsonProperties | null>(null);
  const lastSelectedLayer = useRef<Path | null>(null);

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
    <div className="relative h-screen w-full">
      <MapContainer center={[-1.94, 29.87]} zoom={9} className="h-full w-full">
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

      {selected && (
        <Card className="absolute top-4 right-4 z-1000 max-h-[calc(100%-2rem)] w-[340px] max-w-[calc(100%-2rem)] overflow-auto border-white/10 bg-zinc-950/80 text-zinc-50 shadow-2xl backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <CardDescription className="text-zinc-300/80">
                  Selected village
                </CardDescription>
                <CardTitle className="mt-1 wrap-break-word text-zinc-50">
                  {getLabel(selected, "NAME_5")}
                </CardTitle>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  if (lastSelectedLayer.current) {
                    lastSelectedLayer.current.setStyle(baseStyle);
                    lastSelectedLayer.current = null;
                  }
                  setSelected(null);
                }}
                aria-label="Close selected village details"
              >
                Close
              </Button>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3">
            {[
              ["Cell", "NAME_4"],
              ["Sector", "NAME_3"],
              ["District", "NAME_2"],
              ["Province", "NAME_1"],
              ["Country", "NAME_0"],
              ["IDs", "ID_5"],
            ].map(([label, key]) => (
              <div key={key} className="grid grid-cols-[96px_1fr] items-baseline gap-3">
                <div className="text-xs text-zinc-300/80">{label}</div>
                <div className="text-sm wrap-break-word text-zinc-50/90">
                  {label === "IDs"
                    ? `P${getLabel(selected, "ID_1")} / D${getLabel(
                        selected,
                        "ID_2",
                      )} / S${getLabel(selected, "ID_3")} / C${getLabel(
                        selected,
                        "ID_4",
                      )} / V${getLabel(selected, "ID_5")}`
                    : getLabel(selected, key)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
