import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminBanner, AdminCoupon, CouponInput, Product } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { CatalogRepository } from '../catalog/catalog.repository.js';
import { BannerDto, CouponDto, ProductDiscountDto, UpdateBannerDto, UpdateCouponDto } from './offers.dto.js';
import { OffersService } from './offers.service.js';

/** Only the fields sent: a PATCH's missing ones are undefined and must not blank the saved ones. */
const sent = <T extends object>(body: T): Partial<T> => Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as Partial<T>;

const toInput = (body: CouponDto): CouponInput => ({
  ...body,
  storeId: body.storeId ?? null,
  maxDiscount: body.maxDiscount ?? null,
  startsAt: body.startsAt ?? null,
  endsAt: body.endsAt ?? null,
  totalLimit: body.totalLimit ?? null,
});

/** التسويق والعروض › الكوبونات والعروض (contract §11 A15). The admin's only [Owner, 2026-11-26]. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminOffersController {
  constructor(
    private readonly offers: OffersService,
    private readonly catalog: CatalogRepository,
    private readonly audit: AuditService,
  ) {}

  @Get('coupons')
  coupons(): Promise<AdminCoupon[]> {
    return this.offers.listCoupons();
  }

  @Post('coupons')
  async createCoupon(@CurrentUser() me: AuthUser, @Body() body: CouponDto): Promise<AdminCoupon> {
    const made = await this.offers.createCoupon(toInput(body));
    await this.audit.record(me.id, 'coupon.create', { type: 'coupon', id: made.id, name: made.title }, { ...toInput(body) });
    return made;
  }

  @Patch('coupons/:id')
  async updateCoupon(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateCouponDto): Promise<AdminCoupon> {
    const change = sent(body);
    const saved = await this.offers.updateCoupon(id, change);
    await this.audit.record(me.id, 'coupon.update', { type: 'coupon', id, name: saved.title }, change);
    return saved;
  }

  /** Orders placed with it keep its code and discount. */
  @Delete('coupons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCoupon(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    const gone = await this.offers.deleteCoupon(id);
    await this.audit.record(me.id, 'coupon.delete', { type: 'coupon', id, name: gone.title }, { code: gone.code });
  }

  @Put('products/:id/discount')
  @ApiOperation({ summary: 'A product discount (§8.10): the old price struck through, and who pays it' })
  async setDiscount(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: ProductDiscountDto): Promise<Product> {
    const oldPrice = body.oldPrice ?? null;
    const row = await this.offers.setDiscount(id, oldPrice, body.paidBy);
    await this.audit.record(me.id, 'product.discount', { type: 'product', id, name: row.name }, { oldPrice, paidBy: body.paidBy });
    const [product] = await this.catalog.withChoices([row]);
    return product!;
  }

  @Get('banners')
  banners(): Promise<AdminBanner[]> {
    return this.offers.listBanners();
  }

  @Post('banners')
  async createBanner(@CurrentUser() me: AuthUser, @Body() body: BannerDto): Promise<AdminBanner> {
    const made = await this.offers.createBanner(body);
    await this.audit.record(me.id, 'banner.create', { type: 'banner', id: made.id, name: made.storeName }, { ...body });
    return made;
  }

  @Patch('banners/:id')
  async updateBanner(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateBannerDto): Promise<AdminBanner> {
    const change = sent(body);
    const saved = await this.offers.updateBanner(id, change);
    await this.audit.record(me.id, 'banner.update', { type: 'banner', id, name: saved.storeName }, change);
    return saved;
  }

  @Delete('banners/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBanner(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    const gone = await this.offers.deleteBanner(id);
    await this.audit.record(me.id, 'banner.delete', { type: 'banner', id, name: gone.storeName });
  }
}
