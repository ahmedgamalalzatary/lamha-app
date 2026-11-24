import { unlink } from 'node:fs/promises';
import path from 'node:path';

/** A real 1×1 PNG, small enough to inline; the API's image upload reads it with sharp. */
const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const pngFile = (name = 'photo.png') => new File([Buffer.from(PNG_1X1, 'base64')], name, { type: 'image/png' });

/**
 * Deletes an image the tests uploaded. The test API runs in apps/api, so it stores uploads in the
 * dev folder apps/api/uploads; leave nothing behind there.
 */
export async function removeUpload(url: string): Promise<void> {
  if (!url.startsWith('/uploads/catalog/')) return;
  await unlink(path.resolve('../api', url.slice(1))).catch(() => undefined);
}
