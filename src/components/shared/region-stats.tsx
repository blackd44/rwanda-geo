import type { SearchItem } from "@/components/shared/location-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

export default function RegionStatsCard({
  region,
  stats,
  onClose,
}: {
  region: SearchItem;
  stats: { villages: number; cells: number; sectors: number; districts: number };
  onClose: () => void;
}) {
  const rows: Array<[string, number]> = (() => {
    switch (region.level) {
      case "Province":
        return [
          ["Districts", stats.districts],
          ["Sectors", stats.sectors],
          ["Cells", stats.cells],
          ["Villages", stats.villages],
        ];
      case "District":
        return [
          ["Sectors", stats.sectors],
          ["Cells", stats.cells],
          ["Villages", stats.villages],
        ];
      case "Sector":
        return [
          ["Cells", stats.cells],
          ["Villages", stats.villages],
        ];
      case "Cell":
        return [["Villages", stats.villages]];
      default:
        return [["Villages", stats.villages]];
    }
  })();

  return (
    <Card className="max-h-[calc(100vh-2rem)] w-[340px] max-w-[calc(100vw-2rem)] overflow-auto border-orange-500/10 bg-linear-to-br from-zinc-950/80 from-50% to-orange-950/80 to-150% text-zinc-50 shadow-2xl backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4">
              <CardTitle className="mt-1 wrap-break-word text-zinc-50">
                {region.name}
              </CardTitle>
              <Badge variant="outline" className="border-white/15 text-zinc-200">
                {region.level}
              </Badge>
            </div>
            {region.parentsLabel && (
              <div className="mt-1 text-xs text-zinc-400">{region.parentsLabel}</div>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 p-2"
            onClick={onClose}
            aria-label="Close highlighted region stats"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline gap-2 rounded-md bg-white/5 p-2 py-1 shadow"
          >
            <div className="text-xs text-zinc-300/80">{label}</div>
            <div className="text-sm text-zinc-50/90">{value.toLocaleString()}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
