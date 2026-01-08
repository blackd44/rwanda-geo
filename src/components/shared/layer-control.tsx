import { LayersControl, TileLayer, LayerGroup } from "react-leaflet";

export function LayerControl() {
  return (
    <LayersControl position="bottomleft">
      <LayersControl.BaseLayer checked name="🗺️ Map">
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="🛰️ Satellite">
        <LayerGroup>
          <TileLayer
            attribution="Tiles © Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            attribution="Tiles © Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
          />
        </LayerGroup>
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}
