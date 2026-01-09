import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import type { GeoJsonProperties } from "geojson";
import { XIcon, Copy } from "lucide-react";
import type { LatLng } from "leaflet";
import { latLngToDMS } from "@/lib/dms";
import { copyToClipboard } from "@/lib/copy";
import { getLabel, handleHighlight } from "@/lib/search-index";
import { cn } from "@/lib/utils";

export default function SelectedCard({
  latlng,
  selected,
  setSelected,
  setHighlightedId,
}: {
  latlng?: LatLng | null;
  selected: GeoJsonProperties | null;
  setHighlightedId?: (value: string) => void;
  setSelected: (selected: GeoJsonProperties | null) => void;
}) {
  console.log(getLabel(selected, `ID_4`));
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
            {latlng && (
              <button
                type="button"
                onClick={async () => {
                  await copyToClipboard(`${latlng.lat}, ${latlng.lng}`);
                }}
                className="group mt-1 flex items-center gap-1.5 text-[10px] text-zinc-300/80 underline-offset-2 transition hover:text-zinc-50 hover:underline focus:text-green-200 md:text-xs"
              >
                <span>{latLngToDMS(latlng.lat, latlng.lng)}</span>
                <Copy className="h-3 w-3 opacity-0 transition group-hover:opacity-100 group-focus:scale-50 group-focus:opacity-100" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-auto shrink-0 p-1! md:p-2"
            onClick={() => {
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
          ["Cell", 4],
          ["Sector", 3],
          ["District", 2],
          ["Province", 1],
          ["Country", 0],
          ["IDs", "ID_5"],
        ].map(([label, key]) => (
          <div
            key={key}
            className="grid grid-cols-[70px_1fr] items-baseline gap-2 rounded max-md:flex max-md:gap-2 max-md:bg-white/10 max-md:px-1 md:grid-cols-[96px_1fr] md:gap-3"
          >
            <div className="text-[10px] text-zinc-300/80 md:text-xs">{label}</div>
            <div className="text-xs wrap-break-word text-zinc-50/90 md:text-sm">
              {label === "IDs" ? (
                `P${getLabel(selected, "ID_1")} / D${getLabel(
                  selected,
                  "ID_2",
                )} / S${getLabel(selected, "ID_3")} / C${getLabel(
                  selected,
                  "ID_4",
                )} / V${getLabel(selected, "ID_5")}`
              ) : (
                <Label
                  key={key}
                  label={`${label}`}
                  selected={selected}
                  keyValue={key.toString()}
                  setHighlightedId={setHighlightedId}
                />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Label({
  selected,
  label,
  keyValue,
  setHighlightedId,
}: {
  selected: GeoJsonProperties | null;
  label: string;
  keyValue: string;
  setHighlightedId?: (value: string) => void;
}) {
  return (
    <button
      onClick={() => handleHighlight({ selected, keyValue, label, setHighlightedId })}
      className={cn(
        keyValue !== "0" &&
          "cursor-pointer underline-offset-2 hover:underline focus:text-blue-400",
      )}
      type="button"
      aria-label={`Highlight ${label}`}
    >
      {getLabel(selected, `NAME_${keyValue}`)}
    </button>
  );
}
