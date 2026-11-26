import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CATALOG, type Me, type UploadedImage } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { DeleteMeDto, UpdateMeDto } from './dto/me.dto.js';
import { UsersService } from './users.service.js';

/** Router for `/v1/me`: the signed-in account. */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.users.getMe(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() body: UpdateMeDto): Promise<Me> {
    return this.users.updateMe(user.id, body);
  }

  /**
   * The photo of a pharmacy request (contract §8.11: "التقط صورة" or "اختر من المعرض"), sent before
   * checkout. [Derived] Like every upload it is served under an unguessable name.
   */
  @Post('uploads')
  @Roles('customer')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: CATALOG.uploadMaxBytes, files: 1 },
      fileFilter: (_req, file, done) => done(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  upload(@UploadedFile() file?: { buffer: Buffer }): Promise<UploadedImage> {
    if (!file) throw new ApiException(HttpStatus.BAD_REQUEST, 'IMAGE_INVALID', 'Add a photo (JPEG, PNG or WebP) in the image field');
    return this.uploads.saveImage(file.buffer, 'requests');
  }

  /** The profile's "اختر صورة" (contract §8.14): one photo in the `image` field becomes the avatar. */
  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: CATALOG.uploadMaxBytes, files: 1 },
      fileFilter: (_req, file, done) => done(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  async setAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file?: { buffer: Buffer }): Promise<Me> {
    if (!file) throw new ApiException(HttpStatus.BAD_REQUEST, 'IMAGE_INVALID', 'Add a photo (JPEG, PNG or WebP) in the image field');
    return this.users.setAvatar(user.id, (await this.uploads.saveImage(file.buffer, 'avatars')).url);
  }

  /** Customers only: partner and driver accounts are closed by the admin (contract §2). */
  @Delete()
  @Roles('customer')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Body() body: DeleteMeDto): Promise<void> {
    await this.users.deleteMe(user.id, body.password);
  }
}
