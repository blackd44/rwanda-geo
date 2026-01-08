import type { LeafletMouseEventHandlerFn } from "leaflet";
import { useMapEvents } from "react-leaflet";

export function MapClickHandler({
  onMapClick,
  onMapDoubleClick,
}: {
  onMapClick?: LeafletMouseEventHandlerFn;
  onMapDoubleClick?: LeafletMouseEventHandlerFn;
}) {
  useMapEvents({
    click: onMapClick,
    dblclick: onMapDoubleClick,
  });
  return null;
}
