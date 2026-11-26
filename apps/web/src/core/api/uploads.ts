import type { UploadedImage } from '@tawsela/shared';
import { api } from './client';

export function uploadImage(file: File) {
  const form = new FormData();
  form.append('image', file);
  return api.request<UploadedImage>('/admin/uploads', { method: 'POST', body: form });
}
