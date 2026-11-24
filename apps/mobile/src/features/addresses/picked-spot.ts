import type { LatLng } from '@tawsela/shared';
import { create } from 'zustand';

/**
 * The spot the map picker hands to the address form: "تأكيد الموقع" sets it, the form reads it.
 * `label` is the plus code and locality shown under "الموقع" ("8RCP+FJM، Qesm Al Fayoum").
 */
export const usePickedSpot = create<{ spot: (LatLng & { label: string }) | null }>(() => ({ spot: null }));

/** Map zoom from the region's width: Google's zoom levels, 0 shows the world. */
export const zoomOf = (longitudeDelta: number) => Math.log2(360 / longitudeDelta);

/** [Open] "تأكيد الموقع" turns on from this zoom; Tawsilty's exact level is not known. */
export const PIN_ZOOM = 16;
