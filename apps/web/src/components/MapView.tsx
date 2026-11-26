'use client';

import type { LatLng } from '@tawsela/shared';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

type Leaflet = typeof import('leaflet');

/** Fayoum city, Tawsilty's area: where an empty map opens. */
const FAYOUM: LatLng = { lat: 29.3084, lng: 30.8428 };
const ORANGE = '#B44A0E';

type Props = {
  /** Read out to screen readers: "حدود المنطقة", "موقع المتجر". */
  label: string;
  /** Outline mode: each click adds a corner. */
  outline?: LatLng[];
  onOutline?: (points: LatLng[]) => void;
  /** Pin mode: a click moves the pin. */
  pin?: LatLng | null;
  onPin?: (point: LatLng) => void;
};

/** Redraws the outline's corners and shape, or the pin. */
function draw(L: Leaflet, group: LayerGroup, outline: LatLng[] | undefined, pin: LatLng | null | undefined) {
  group.clearLayers();
  const dot = (p: LatLng) => L.circleMarker([p.lat, p.lng], { radius: 6, color: ORANGE, fillOpacity: 1 }).addTo(group);
  if (outline?.length) {
    L.polygon(
      outline.map((p) => [p.lat, p.lng]),
      { color: ORANGE },
    ).addTo(group);
    outline.forEach(dot);
  }
  if (pin) dot(pin);
}

/**
 * A map the admin clicks on: OpenStreetMap tiles through Leaflet, which need no key. [Open] Tawsilty's
 * admin map is not captured; the apps use Google Maps once its key is set.
 */
export function MapView({ label, outline, onOutline, pin, onPin }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<{ L: Leaflet; map: LeafletMap; group: LayerGroup } | null>(null);
  // The latest props, for the click handler made once.
  const latest = useRef({ outline, onOutline, pin, onPin });
  useEffect(() => {
    latest.current = { outline, onOutline, pin, onPin };
  });

  useEffect(() => {
    let gone = false;
    let made: LeafletMap | undefined;
    void import('leaflet').then((L) => {
      if (gone || !box.current) return;
      const start = latest.current.pin ?? latest.current.outline?.[0] ?? FAYOUM;
      made = L.map(box.current).setView([start.lat, start.lng], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(made);
      made.on('click', (e) => {
        const point = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) };
        const now = latest.current;
        if (now.onOutline) now.onOutline([...(now.outline ?? []), point]);
        else now.onPin?.(point);
      });
      setReady({ L, map: made, group: L.layerGroup().addTo(made) });
    });
    return () => {
      gone = true;
      made?.remove();
    };
  }, []);

  useEffect(() => {
    if (ready) draw(ready.L, ready.group, outline, pin);
  }, [ready, outline, pin]);

  return <div ref={box} role="application" aria-label={label} className="h-80 w-full overflow-hidden rounded-xl border border-tw-line" />;
}
