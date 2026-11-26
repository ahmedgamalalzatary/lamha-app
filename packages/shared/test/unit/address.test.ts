import { describe, expect, it } from 'vitest';
import { addressErrors, addressLine, distanceKm, inZone, plusCode, shortPlusCode, zoneAt, zoneShapeError, type AddressInput, type LatLng } from '../../src/address.js';
import { applyStoreFilter } from '../../src/store-list.js';

// A square around Fayoum city and one around Giza.
const fayoum = { id: 1, name: 'الفيوم', polygon: [{ lat: 29.25, lng: 30.78 }, { lat: 29.36, lng: 30.78 }, { lat: 29.36, lng: 30.9 }, { lat: 29.25, lng: 30.9 }] };
const giza = { id: 2, name: 'الجيزة', polygon: [{ lat: 29.9, lng: 31.1 }, { lat: 30.1, lng: 31.1 }, { lat: 30.1, lng: 31.25 }, { lat: 29.9, lng: 31.25 }] };
const fayoumUniversity = { lat: 29.3205, lng: 30.8364 };

describe('delivery zones (contract §8.9 "التوصيل متاح لهذا الموقع")', () => {
  it('finds the zone a spot is inside, and none outside every zone', () => {
    expect(inZone(fayoumUniversity, fayoum.polygon)).toBe(true);
    expect(zoneAt(fayoumUniversity, [giza, fayoum])?.name).toBe('الفيوم');
    expect(zoneAt({ lat: 30.05, lng: 31.2 }, [giza, fayoum])?.name).toBe('الجيزة');
    expect(zoneAt({ lat: 31.2, lng: 29.9 }, [giza, fayoum])).toBeUndefined();
    // An outline with fewer than three points holds nothing.
    expect(inZone(fayoumUniversity, fayoum.polygon.slice(0, 2))).toBe(false);
  });

  it('names what is wrong with an outline the admin drew (review F20)', () => {
    const [a, b, c, d] = fayoum.polygon as [LatLng, LatLng, LatLng, LatLng];
    expect(zoneShapeError(fayoum.polygon)).toBeNull();
    expect(zoneShapeError([a, b])).toBe('TOO_FEW');
    // The same corner twice, next to each other or not.
    expect(zoneShapeError([a, a, b, c])).toBe('REPEATED');
    expect(zoneShapeError([a, b, a, c])).toBe('REPEATED');
    // Three corners on one line hold no area.
    expect(zoneShapeError([a, { lat: 29.3, lng: 30.78 }, b])).toBe('NO_AREA');
    // A bow tie: two edges cross.
    expect(zoneShapeError([a, c, b, d])).toBe('CROSSING');
  });

  it('measures the distance between two spots in km', () => {
    expect(distanceKm(fayoumUniversity, fayoumUniversity)).toBe(0);
    expect(distanceKm({ lat: 29.3084, lng: 30.8428 }, { lat: 30.0444, lng: 31.2357 })).toBeCloseTo(90.5, 0);
  });
});

describe('the plus code under "موقع التوصيل" (map-picker captures)', () => {
  it('encodes 11 digits as Google does, and drops the first four for the short form', () => {
    // The Open Location Code reference vector.
    expect(plusCode(20.3701125, 2.782234375)).toBe('7FG49QCJ+2VX');
    expect(shortPlusCode(20.3701125, 2.782234375)).toBe('9QCJ+2VX');
    // Fayoum University reads "8RCP+…" as in new-address-form-filled.png.
    expect(shortPlusCode(29.3205, 30.8364)).toMatch(/^8RCP\+/);
  });
});

const filled: AddressInput = {
  type: 'apartment',
  building: 'مبنى 2',
  apartment: 'شقه 2',
  floor: null,
  street: 'شارع 2',
  landmark: 'temp',
  phone: '01554459196',
  lat: 29.3205,
  lng: 30.8364,
  isDefault: false,
};

describe('the address form and the saved-addresses line (contract §8.9)', () => {
  it('reads "شارع، مبنى، شقه - المنطقة", skipping empty parts', () => {
    expect(addressLine({ ...filled, zone: { id: 1, name: 'الفيوم' } })).toBe('شارع 2، مبنى 2، شقه 2 - الفيوم');
    expect(addressLine({ ...filled, street: null, building: '', zone: { id: 1, name: 'الفيوم' } })).toBe('شقه 2 - الفيوم');
  });

  it('needs the landmark, the apartment number and a mobile number; the rest is optional', () => {
    // Building, floor and street may be empty.
    expect(addressErrors({ ...filled, building: null, floor: null, street: null } as AddressInput)).toEqual({});
    expect(addressErrors({ ...filled, landmark: '  ', apartment: '', phone: '0123' })).toEqual({
      landmark: 'LANDMARK_REQUIRED',
      apartment: 'APARTMENT_REQUIRED',
      phone: 'INVALID_PHONE',
    });
  });
});

describe('"الأقرب إليك" (contract §8.3)', () => {
  it('sorts by distance from the chosen address; stores with no location go last', () => {
    const store = (id: number, location: { lat: number; lng: number } | null) => ({ id, rating: null, ratingCount: 0, deliveryMinutes: 30, pickupAllowed: false, location });
    const stores = [store(1, { lat: 29.4, lng: 30.9 }), store(2, null), store(3, { lat: 29.321, lng: 30.837 })];
    expect(applyStoreFilter(stores, { sort: 'nearest' }, fayoumUniversity).map((s) => s.id)).toEqual([3, 1, 2]);
    // With no address chosen it keeps the admin's order.
    expect(applyStoreFilter(stores, { sort: 'nearest' }).map((s) => s.id)).toEqual([1, 2, 3]);
  });
});
