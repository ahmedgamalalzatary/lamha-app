import { photoForm } from '@/core/api/photo-form';

// Expo 58 replaces fetch with expo/fetch, which cannot send React Native's `{ uri }` file part: it
// throws "Unsupported FormDataPart implementation" before anything leaves the phone, and the app
// showed "تعذر الاتصال بالخادم" for every profile photo and prescription photo (2026-11-27).
// expo/fetch (convertFormData.ts) sends a string, a Blob, or an object with `bytes()`, taking the
// file name and type from the part's `name` and `type`.
//
// Jest has Node's FormData; the phone has React Native's, which keeps each part as given, so the
// test builds the form with that one.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RNFormData = require('react-native/Libraries/Network/FormData').default as typeof FormData;
const NodeFormData = globalThis.FormData;
beforeAll(() => {
  globalThis.FormData = RNFormData;
});
afterAll(() => {
  globalThis.FormData = NodeFormData;
});

type Part = { name: string; type: string; uri?: string; bytes: () => Promise<Uint8Array> };
const parts = (form: FormData) => (form as unknown as { _parts: [string, Part][] })._parts;

describe('photoForm', () => {
  // "hello" in base64.
  const base64 = 'aGVsbG8=';

  it('sends one part, "image", a JPEG with the file name given', () => {
    const all = parts(photoForm(base64, 'avatar.jpg'));
    expect(all).toHaveLength(1);
    const [[field, part]] = all;
    expect(field).toBe('image');
    expect(part.name).toBe('avatar.jpg');
    expect(part.type).toBe('image/jpeg');
  });

  it('carries the photo bytes through bytes(), with no uri for expo/fetch to refuse', async () => {
    const [[, part]] = parts(photoForm(base64, 'request.jpg'));
    expect(part.uri).toBeUndefined();
    expect([...(await part.bytes())]).toEqual([...new TextEncoder().encode('hello')]);
  });
});
