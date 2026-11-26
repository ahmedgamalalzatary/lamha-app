import type { PharmacyRequestKind, UploadedImage } from '@tawsela/shared';
import type { Href } from 'expo-router';
import { api } from '@/core/api/client';

export const pharmacyApi = {
  /** The request's photo, sent before checkout (POST /v1/me/uploads). */
  upload: (uri: string) => {
    const form = new FormData();
    // React Native's FormData sends a file from its uri.
    form.append('image', { uri, name: 'request.jpg', type: 'image/jpeg' } as unknown as Blob);
    return api<UploadedImage>('/me/uploads', { method: 'POST', body: form });
  },
};

/** What "الروشتة" hands to checkout: the pharmacy, the card it came from, the photo and the text. */
export const requestCheckout = (p: { pharmacy: number; kind: PharmacyRequestKind; image: string | null; text: string }): Href => ({
  pathname: '/checkout',
  params: { pharmacy: String(p.pharmacy), kind: p.kind, ...(p.image ? { image: p.image } : {}), ...(p.text.trim() ? { text: p.text.trim() } : {}) },
});
