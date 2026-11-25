import type { LatLng } from '@tawsela/shared';
import { router } from 'expo-router';
import { create } from 'zustand';

/**
 * The spot the map picker hands to the address form: "تأكيد الموقع" sets it, the form reads it.
 * `label` is the plus code and locality shown under "الموقع" ("8RCP+FJM، Qesm Al Fayoum").
 */
export const usePickedSpot = create<{ spot: (LatLng & { label: string }) | null; confirmed: boolean }>(() => ({ spot: null, confirmed: false }));

/**
 * Checkout's "confirm the location on the map" [Client, §8.6]: opens the picker at the address's spot.
 * "تأكيد الموقع" sets `confirmed`, and checkout goes on with that spot.
 */
export function confirmOnMap(spot: LatLng) {
  usePickedSpot.setState({ spot: { ...spot, label: '' }, confirmed: false });
  router.push('/address/map?from=checkout');
}

/** Map zoom from the region's width: Google's zoom levels, 0 shows the world. */
export const zoomOf = (longitudeDelta: number) => Math.log2(360 / longitudeDelta);

/** [Open] "تأكيد الموقع" turns on from this zoom; Tawsilty's exact level is not known. */
export const PIN_ZOOM = 16;
