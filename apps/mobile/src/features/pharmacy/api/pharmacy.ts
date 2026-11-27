import type { PharmacyRequestKind, UploadedImage } from '@tawsela/shared';
import type { Href } from 'expo-router';
import { api } from '@/core/api/client';
import { photoForm } from '@/core/api/photo-form';

export const pharmacyApi = {
  /** The request's photo, sent before checkout (POST /v1/me/uploads). */
  upload: (base64: string) => api<UploadedImage>('/me/uploads', { method: 'POST', body: photoForm(base64, 'request.jpg') }),
};

/** What "الروشتة" hands to checkout: the pharmacy, the card it came from, the photo and the text. */
export const requestCheckout = (p: { pharmacy: number; kind: PharmacyRequestKind; image: string | null; text: string }): Href => ({
  pathname: '/checkout',
  params: { pharmacy: String(p.pharmacy), kind: p.kind, ...(p.image ? { image: p.image } : {}), ...(p.text.trim() ? { text: p.text.trim() } : {}) },
});
