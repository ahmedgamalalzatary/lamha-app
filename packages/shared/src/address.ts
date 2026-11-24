// Saved addresses, delivery zones and the map picker (contract §8.9), shared by the API and the apps.
import type { AddressType } from './enums.js';
import { isEgyptianMobile } from './format.js';

export interface LatLng {
  lat: number;
  lng: number;
}

/** A delivery area the admin outlines on the map (الإعدادات › المناطق). */
export interface Zone {
  id: number;
  name: string;
  /** The outline's corners, in order. */
  polygon: LatLng[];
  /** Switched-off zones take no new addresses and their stores are not listed. */
  active: boolean;
}

export type ZoneInput = Omit<Zone, 'id'>;

/** POST /v1/zones/check: the zone a spot is in, or null ("التوصيل غير متاح لهذا الموقع"). */
export interface ZoneCheck {
  zone: { id: number; name: string } | null;
}

/** What the address form sends ("عنوان جديد" / "تعديل العنوان"). */
export interface AddressInput extends LatLng {
  type: AddressType;
  /** اسم المبنى (اختياري) */
  building: string | null;
  /** رقم الشقة */
  apartment: string;
  /** الدور (اختياري) */
  floor: string | null;
  /** الشارع (اختياري) */
  street: string | null;
  /** علامة مميزة: the address's title in the saved-addresses sheet and the home header. */
  landmark: string;
  phone: string;
  /** تعيين كعنوان افتراضي. The first address is the default whatever this says. */
  isDefault: boolean;
}

/** A saved address, with the zone its spot is in (the "- المنطقة" part of its line). */
export interface Address extends AddressInput {
  id: number;
  zone: { id: number; name: string };
}

/** Errors the form shows; the app turns each code into words ("يرجى إدخال علامة مميزة للعنوان"). */
export type AddressError = 'LANDMARK_REQUIRED' | 'APARTMENT_REQUIRED' | 'INVALID_PHONE';

export function addressErrors(a: Pick<AddressInput, 'landmark' | 'apartment' | 'phone'>): Partial<Record<'landmark' | 'apartment' | 'phone', AddressError>> {
  const errors: Partial<Record<'landmark' | 'apartment' | 'phone', AddressError>> = {};
  if (!a.landmark.trim()) errors.landmark = 'LANDMARK_REQUIRED';
  if (!a.apartment.trim()) errors.apartment = 'APARTMENT_REQUIRED';
  if (!isEgyptianMobile(a.phone)) errors.phone = 'INVALID_PHONE';
  return errors;
}

/** "شارع، مبنى، شقه - الجيزة": the second line of a saved address. */
export function addressLine(a: Pick<Address, 'street' | 'building' | 'apartment' | 'zone'>): string {
  const parts = [a.street, a.building, a.apartment].map((p) => p?.trim()).filter(Boolean);
  return `${parts.join('، ')} - ${a.zone.name}`;
}

/** Whether a spot is inside an outline (ray casting; an outline needs three corners). */
export function inZone(p: LatLng, polygon: readonly LatLng[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) inside = !inside;
  }
  return inside;
}

/** The first zone holding the spot. */
export const zoneAt = <Z extends Pick<Zone, 'polygon'>>(p: LatLng, zones: readonly Z[]): Z | undefined => zones.find((z) => inZone(p, z.polygon));

/** Straight-line distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const OLC = '23456789CFGHJMPQRVWX';

/** The Open Location Code of a spot, 11 digits ("7FG49QCJ+2VX"), as Google Maps shows it. */
export function plusCode(lat: number, lng: number): string {
  const clippedLat = Math.min(Math.max(lat, -90), 90);
  const normLng = ((((lng + 180) % 360) + 360) % 360) - 180;
  // Whole units of the 11th digit's cell: 1/8000° split into 5 rows and 4 columns.
  let y = Math.floor(Math.round((clippedLat + 90) * 40000 * 1e6) / 1e6);
  let x = Math.floor(Math.round((normLng + 180) * 32000 * 1e6) / 1e6);
  y = Math.min(y, 180 * 40000 - 1);
  const grid = OLC[(y % 5) * 4 + (x % 4)];
  y = Math.floor(y / 5);
  x = Math.floor(x / 4);
  let pairs = '';
  for (let i = 0; i < 5; i++) {
    pairs = OLC[y % 20]! + OLC[x % 20]! + pairs;
    y = Math.floor(y / 20);
    x = Math.floor(x / 20);
  }
  return `${pairs.slice(0, 8)}+${pairs.slice(8)}${grid}`;
}

/** "8RCP+FJM": the plus code without its area prefix; the app adds the locality after it. */
export const shortPlusCode = (lat: number, lng: number) => plusCode(lat, lng).slice(4);
