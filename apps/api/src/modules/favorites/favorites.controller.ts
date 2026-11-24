import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CatalogStore } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { FavoritesRepository } from './favorites.repository.js';

/**
 * Router for `/v1/me/favorites`: the customer's favourite stores (§8.14 "الخدمات المفضلة"), set
 * with the heart on the store page (§8.4). Customers only.
 */
@ApiTags('me')
@ApiBearerAuth()
@Roles('customer')
@Controller('me/favorites')
export class FavoritesController {
  constructor(
    private readonly favorites: FavoritesRepository,
    private readonly catalog: CatalogService,
  ) {}

  /** The newest first; a store the admin hid drops out until it is shown again. */
  @Get()
  async list(@CurrentUser() me: AuthUser): Promise<CatalogStore[]> {
    return this.catalog.storesByIds(await this.favorites.storeIdsOf(me.id));
  }

  @Put(':storeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async add(@CurrentUser() me: AuthUser, @Param('storeId', ParseIntPipe) storeId: number): Promise<void> {
    if (!(await this.catalog.isVisible(storeId))) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No store has this id');
    await this.favorites.add(me.id, storeId);
  }

  @Delete(':storeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() me: AuthUser, @Param('storeId', ParseIntPipe) storeId: number): Promise<void> {
    await this.favorites.remove(me.id, storeId);
  }
}
