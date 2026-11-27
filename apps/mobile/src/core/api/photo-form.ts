/**
 * The form for a photo upload (POST /me/avatar, /me/uploads): the photo's bytes as "image".
 *
 * Expo 58 replaces fetch with expo/fetch, which refuses React Native's `{ uri }` file part ("`uri` is
 * not supported", convertFormData.ts) and throws before sending, so every upload showed "تعذر الاتصال
 * بالخادم". It sends a part that has `bytes()`, so the picker returns the photo as base64 and it goes
 * as bytes.
 */
export function photoForm(base64: string, name: string): FormData {
  const binary = atob(base64);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
  const form = new FormData();
  form.append('image', { name, type: 'image/jpeg', bytes: async () => data } as unknown as Blob);
  return form;
}
