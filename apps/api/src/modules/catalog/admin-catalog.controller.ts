import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AdminProduct, AdminStore, Category, CreatedStore, Cuisine, HomeTile, Product } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import {
  CategoryDto,
  CreateProductDto,
  CreateStoreDto,
  HomeTileDto,
  NamedImageDto,
  OrderDto,
  StoreListQuery,
  UpdateCategoryDto,
  UpdateHomeTileDto,
  UpdateNamedImageDto,
  UpdateProductDto,
  UpdateStoreDto,
} from './dto/catalog.dto.js';

/** Router for `/v1/admin/stores`, `/categories`, `/products`: الموردين and المنتجات والكتالوج. Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminCatalogController {
  constructor(
    private readonly admin: AdminCatalogService,
    private readonly audit: AuditService,
  ) {}

  @Get('stores')
  listStores(@CurrentUser() me: AuthUser, @Query() query: StoreListQuery): Promise<AdminStore[]> {
    return this.admin.listStores(me.id, query.vertical);
  }

  /** The store and its partner account; the generated password is in the answer, once. */
  @Post('stores')
  async createStore(@CurrentUser() me: AuthUser, @Body() body: CreateStoreDto): Promise<CreatedStore> {
    const created = await this.admin.createStore(me.id, body);
    const { partner, ...fields } = body;
    await this.audit.record(me.id, 'store.create', { type: 'store', id: created.store.id, name: created.store.name }, { ...fields, name: created.store.name });
    await this.audit.recordAccount(me.id, 'partner.create', created.partner.account.id, { phone: partner.phone, storeId: created.store.id });
    return created;
  }

  @Get('stores/:id')
  getStore(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<AdminStore> {
    return this.admin.getStore(me.id, id);
  }

  /** Each save is recorded with the fields it sent (availability included: active, closedNow). */
  @Patch('stores/:id')
  async updateStore(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateStoreDto): Promise<AdminStore> {
    const store = await this.admin.updateStore(me.id, id, body);
    await this.audit.record(me.id, 'store.update', { type: 'store', id, name: store.name }, { ...body });
    return store;
  }

  @Get('stores/:id/categories')
  listCategories(@Param('id', ParseIntPipe) id: number): Promise<Category[]> {
    return this.admin.listCategories(id);
  }

  @Post('stores/:id/categories')
  createCategory(@Param('id', ParseIntPipe) id: number, @Body() body: CategoryDto): Promise<Category> {
    return this.admin.createCategory(id, body);
  }

  @Put('stores/:id/categories/order')
  orderCategories(@Param('id', ParseIntPipe) id: number, @Body() body: OrderDto): Promise<Category[]> {
    return this.admin.orderCategories(id, body.ids);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCategoryDto): Promise<Category> {
    return this.admin.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.admin.deleteCategory(id);
  }

  @Get('stores/:id/products')
  listProducts(@Param('id', ParseIntPipe) id: number): Promise<Product[]> {
    return this.admin.listProducts(id);
  }

  @Post('stores/:id/products')
  createProduct(@Param('id', ParseIntPipe) id: number, @Body() body: CreateProductDto): Promise<Product> {
    return this.admin.createProduct(id, body);
  }

  /** منتجات غير فعالة (§11): every store's switched-off products. */
  @Get('products/inactive')
  listInactiveProducts(): Promise<AdminProduct[]> {
    return this.admin.listInactiveProducts();
  }

  @Patch('products/:id')
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateProductDto): Promise<Product> {
    return this.admin.updateProduct(id, body);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.admin.deleteProduct(id);
  }

  @Get('cuisines')
  listCuisines(): Promise<Cuisine[]> {
    return this.admin.listCuisines();
  }

  @Post('cuisines')
  createCuisine(@Body() body: NamedImageDto): Promise<Cuisine> {
    return this.admin.createCuisine(body);
  }

  @Put('cuisines/order')
  orderCuisines(@Body() body: OrderDto): Promise<Cuisine[]> {
    return this.admin.orderCuisines(body.ids);
  }

  @Patch('cuisines/:id')
  updateCuisine(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateNamedImageDto): Promise<Cuisine> {
    return this.admin.updateCuisine(id, body);
  }

  @Delete('cuisines/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCuisine(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.admin.deleteCuisine(id);
  }

  @Get('home-tiles')
  listHomeTiles(): Promise<HomeTile[]> {
    return this.admin.listHomeTiles();
  }

  @Post('home-tiles')
  createHomeTile(@Body() body: HomeTileDto): Promise<HomeTile> {
    return this.admin.createHomeTile(body);
  }

  @Put('home-tiles/order')
  orderHomeTiles(@Body() body: OrderDto): Promise<HomeTile[]> {
    return this.admin.orderHomeTiles(body.ids);
  }

  @Patch('home-tiles/:id')
  updateHomeTile(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateHomeTileDto): Promise<HomeTile> {
    return this.admin.updateHomeTile(id, body);
  }

  @Delete('home-tiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteHomeTile(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.admin.deleteHomeTile(id);
  }
}
