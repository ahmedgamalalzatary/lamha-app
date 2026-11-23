"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { MapPin } from "lucide-react";

function Watch({ onMove }: { onMove: (c: [number, number]) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove([c.lat, c.lng]);
    },
  });
  return null;
}

/** Map with a fixed center pin: the customer moves the map under the pin. */
export default function PinMap({ center, onMove, height = 280 }: { center: [number, number]; onMove: (c: [number, number]) => void; height?: number }) {
  return (
    <div className="relative z-0" style={{ height }}>
      <MapContainer center={center} zoom={16} zoomControl={false} className="h-full w-full">
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <Watch onMove={onMove} />
      </MapContainer>
      <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center">
        <div className="-translate-y-5 flex flex-col items-center">
          <span className="rounded-xl bg-ink px-2.5 py-1 text-[12px] text-white shadow-lift">التوصيل هنا</span>
          <MapPin className="size-11 fill-pen text-white drop-shadow-lg" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
