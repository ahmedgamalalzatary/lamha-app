import { Controller, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiPayloadTooLargeResponse, ApiTags } from '@nestjs/swagger';
import { CATALOG, type UploadedImage } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UploadsService } from './uploads.service.js';

/** Router for `/v1/admin/uploads`: one image for the catalog forms. Admins only (partners join in Phase 11). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** One image in the `image` field (JPEG, PNG or WebP). Returns its path, for the form's image field. */
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } })
  @ApiPayloadTooLargeResponse({ description: 'Over 8 MB' })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: CATALOG.uploadMaxBytes, files: 1 },
      fileFilter: (_req, file, done) => done(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  upload(@UploadedFile() file?: { buffer: Buffer }): Promise<UploadedImage> {
    if (!file) throw new ApiException(HttpStatus.BAD_REQUEST, 'IMAGE_INVALID', 'Add an image (JPEG, PNG or WebP) in the image field');
    return this.uploads.saveImage(file.buffer);
  }
}
