import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import type { GeoJsonProperties } from "geojson";
import type { Path, PathOptions } from "leaflet";
import { XIcon } from "lucide-react";

export default function SelectedCard({
  selected,
  lastSelectedLayerRef,
  baseStyle,
  setSelected,
}: {
  selected: GeoJsonProperties | null;
  lastSelectedLayerRef: React.RefObject<Path | null>;
  baseStyle: PathOptions;
  setSelected: (selected: GeoJsonProperties | null) => void;
}) {
  const getLabel = (p: GeoJsonProperties | null | undefined, key: string) => {
    const v =
      p && typeof p === "object" ? (p as Record<string, unknown>)[key] : undefined;
    if (v === null || v === undefined || v === "") return "Unknown";
    return String(v);
  };

  return (
    <Card className="max-h-[calc(100vh-2rem)] w-[280px] max-w-[calc(100vw-2rem)] overflow-auto border-white/10 bg-linear-to-br from-zinc-950/80 from-50% to-blue-950/80 to-120% text-zinc-50 shadow-2xl backdrop-blur md:w-[340px]">
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex items-start gap-2 md:gap-3">
          <div className="min-w-0 flex-1">
            <CardDescription className="text-[10px] text-zinc-300/80 max-md:hidden md:text-xs">
              Selected village
            </CardDescription>
            <CardTitle className="mt-1 text-sm wrap-break-word text-zinc-50 md:text-base">
              {getLabel(selected, "NAME_5")}
            </CardTitle>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-auto shrink-0 p-1! md:p-2"
            onClick={() => {
              if (lastSelectedLayerRef.current) {
                lastSelectedLayerRef.current.setStyle(baseStyle);
                lastSelectedLayerRef.current = null;
              }
              setSelected(null);
            }}
            aria-label="Close selected village details"
          >
            <XIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid flex-wrap gap-2 max-md:flex max-md:gap-1">
        {[
          ["Cell", "NAME_4"],
          ["Sector", "NAME_3"],
          ["District", "NAME_2"],
          ["Province", "NAME_1"],
          ["Country", "NAME_0"],
          ["IDs", "ID_5"],
        ].map(([label, key]) => (
          <div
            key={key}
            className="grid grid-cols-[70px_1fr] items-baseline gap-2 rounded max-md:flex max-md:gap-2 max-md:bg-white/10 max-md:px-1 md:grid-cols-[96px_1fr] md:gap-3"
          >
            <div className="text-[10px] text-zinc-300/80 md:text-xs">{label}</div>
            <div className="text-xs wrap-break-word text-zinc-50/90 md:text-sm">
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
  );
}
