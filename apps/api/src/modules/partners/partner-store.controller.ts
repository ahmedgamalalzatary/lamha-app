import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Category, PartnerStore, Product } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AdminCatalogService } from '../catalog/admin-catalog.service.js';
import { CatalogRepository } from '../catalog/catalog.repository.js';
import type { StoreRow } from '../catalog/catalog.schema.js';
import { CategoryDto, CreateProductDto, OrderDto, UpdateCategoryDto, UpdateProductDto } from '../catalog/dto/catalog.dto.js';
import { PartnerStoreDto } from './dto/partner-store.dto.js';
import { CurrentStore, PartnerArea } from './partner-store.guard.js';

const notFound = (what: string) => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', `No ${what} of this store has this id`);

/**
 * Router for `/v1/partner/store`, `/categories`, `/products`: the partner's own store (contract §11.1).
 * The admin's catalog code, held to the partner's store: another store's category or product is
 * "not found". A partner edits only hours, open now and the cover on the store itself.
 */
@ApiTags('partner')
@ApiBearerAuth()
@PartnerArea()
@Controller('partner')
export class PartnerStoreController {
  constructor(
    private readonly admin: AdminCatalogService,
    private readonly catalog: CatalogRepository,
  ) {}

  @Get('store')
  getStore(@CurrentUser() me: AuthUser, @CurrentStore() store: StoreRow): Promise<PartnerStore> {
    return this.own(me.id, store.id);
  }

  @Patch('store')
  async updateStore(@CurrentUser() me: AuthUser, @CurrentStore() store: StoreRow, @Body() body: PartnerStoreDto): Promise<PartnerStore> {
    await this.admin.updateStore(me.id, store.id, body);
    return this.own(me.id, store.id);
  }

  @Get('categories')
  listCategories(@CurrentStore() store: StoreRow): Promise<Category[]> {
    return this.admin.listCategories(store.id);
  }

  @Post('categories')
  createCategory(@CurrentStore() store: StoreRow, @Body() body: CategoryDto): Promise<Category> {
    return this.admin.createCategory(store.id, body);
  }

  @Put('categories/order')
  orderCategories(@CurrentStore() store: StoreRow, @Body() body: OrderDto): Promise<Category[]> {
    return this.admin.orderCategories(store.id, body.ids);
  }

  @Patch('categories/:id')
  async updateCategory(@CurrentStore() store: StoreRow, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateCategoryDto): Promise<Category> {
    await this.ownCategory(store.id, id);
    return this.admin.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@CurrentStore() store: StoreRow, @Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.ownCategory(store.id, id);
    await this.admin.deleteCategory(id);
  }

  @Get('products')
  listProducts(@CurrentStore() store: StoreRow): Promise<Product[]> {
    return this.admin.listProducts(store.id);
  }

  @Post('products')
  createProduct(@CurrentStore() store: StoreRow, @Body() body: CreateProductDto): Promise<Product> {
    return this.admin.createProduct(store.id, body);
  }

  @Patch('products/:id')
  async updateProduct(@CurrentStore() store: StoreRow, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateProductDto): Promise<Product> {
    await this.ownProduct(store.id, id);
    return this.admin.updateProduct(id, body);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@CurrentStore() store: StoreRow, @Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.ownProduct(store.id, id);
    await this.admin.deleteProduct(id);
  }

  private async own(meId: number, storeId: number): Promise<PartnerStore> {
    const { partners: _partners, ...own } = await this.admin.getStore(meId, storeId);
    return own;
  }

  private async ownCategory(storeId: number, id: number): Promise<void> {
    if ((await this.catalog.findCategory(id))?.storeId !== storeId) throw notFound('category');
  }

  private async ownProduct(storeId: number, id: number): Promise<void> {
    if ((await this.catalog.findProduct(id))?.storeId !== storeId) throw notFound('product');
  }
}
