import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CATALOG, UPLOADS_DIR, type UploadedImage } from '@tawsela/shared';
import sharp from 'sharp';
import { ApiException } from '../../common/api-exception.js';

/**
 * Catalog images (store logos and covers, categories, products, cuisines, home tiles) on the
 * server's disk, served under /uploads/catalog/ (by the API in development, by nginx in production).
 */
@Injectable()
export class UploadsService {
  /** Turned upright, made at most 1600 px on the longest side and stored as JPEG (the camera's metadata is dropped). */
  async saveImage(buffer: Buffer): Promise<UploadedImage> {
    const jpeg = await sharp(buffer)
      .rotate()
      .resize(CATALOG.imagePx, CATALOG.imagePx, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#FFFFFF' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
      .catch(() => {
        throw new ApiException(HttpStatus.BAD_REQUEST, 'IMAGE_INVALID', 'That file is not an image we can read');
      });
    const dir = path.resolve(UPLOADS_DIR, 'catalog');
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.jpg`;
    await writeFile(path.join(dir, name), jpeg);
    return { url: `/uploads/catalog/${name}` };
  }
}
