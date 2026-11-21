"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";

export type LatLng = [number, number];

export function routeBetween(a: LatLng, b: LatLng): LatLng[] {
  const midLng = (a[1] + b[1]) / 2;
  return [a, [a[0], a[1] + (midLng - a[1]) * 0.55], [a[0] + (b[0] - a[0]) * 0.4, midLng], [b[0], midLng + (b[1] - midLng) * 0.3], b];
}

export function pointAt(path: LatLng[], t: number): LatLng {
  const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = seg.reduce((s, d) => s + d, 0);
  let d = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const k = seg[i] ? d / seg[i] : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
    }
    d -= seg[i];
  }
  return path[path.length - 1];
}

const icon = (html: string, size: number) => L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

const storeIcon = (letter: string, bg: string, fg: string) =>
  icon(`<div style="width:40px;height:40px;border-radius:12px;background:${bg};color:${fg};display:grid;place-items:center;font:700 20px var(--font-ruqaa);border:3px solid #fff;box-shadow:0 6px 16px -6px rgba(18,24,56,.5)">${letter}</div>`, 40);
const homeIcon = icon(
  `<div style="width:40px;height:40px;border-radius:999px;background:#1c2fa8;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 6px 16px -6px rgba(18,24,56,.5)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg></div>`,
  40,
);
const riderIcon = icon(
  `<div style="width:46px;height:46px;border-radius:999px;background:#ffe45c;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 0 0 6px rgba(28,47,168,.18),0 8px 18px -6px rgba(18,24,56,.55)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#121838" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
  46,
);

function Fit({ points, padBottom }: { points: LatLng[]; padBottom: number }) {
  const map = useMap();
  useEffect(() => {
    map.attributionControl?.setPrefix(false);
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [48, 80], paddingBottomRight: [48, padBottom], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

export default function OrderMap({
  store, home, progress, phase, mono, height = 300, padBottom = 48,
}: {
  store: LatLng;
  home: LatLng;
  progress: number;
  phase: "toStore" | "atStore" | "toHome" | "done" | "hidden";
  mono: { letter: string; bg: string; fg: string };
  height?: number | string;
  padBottom?: number;
}) {
  const path = useMemo(() => routeBetween(store, home), [store, home]);
  const approach = useMemo<LatLng[]>(() => routeBetween([store[0] + 0.007, store[1] - 0.006], store), [store]);
  const rider: LatLng | null =
    phase === "toStore" ? pointAt(approach, progress) : phase === "atStore" ? store : phase === "toHome" ? pointAt(path, progress) : phase === "done" ? home : null;
  const doneIdx = phase === "toHome" ? progress : phase === "done" ? 1 : 0;
  const donePath = doneIdx > 0 ? [...path.filter((_, i) => i / (path.length - 1) <= doneIdx), pointAt(path, doneIdx)] : [];

  return (
    <div style={{ height }} className="relative z-0">
      <MapContainer center={store} zoom={15} zoomControl={false} attributionControl={true} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        <Fit points={[store, home]} padBottom={padBottom} />
        <Polyline positions={path} pathOptions={{ color: "#1c2fa8", weight: 5, opacity: 0.35, dashArray: "2 10", lineCap: "round" }} />
        {donePath.length > 1 && <Polyline positions={donePath} pathOptions={{ color: "#1c2fa8", weight: 5, opacity: 0.95, lineCap: "round" }} />}
        <Marker position={store} icon={storeIcon(mono.letter, mono.bg, mono.fg)} />
        <Marker position={home} icon={homeIcon} />
        {rider && <Marker position={rider} icon={riderIcon} zIndexOffset={1000} />}
      </MapContainer>
    </div>
  );
}
