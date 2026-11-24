import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import type { AdminProduct, AdminStore, Category, CreatedStore, Cuisine, HomeTile, OptionGroup, Product, ProductOptionsInput, Vertical } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { hashPassword } from '../auth/password.js';
import { generatePassword } from '../users/generated-password.js';
import { toStaffAccount } from '../users/staff-account.js';
import { UsersRepository } from '../users/users.repository.js';
import { cuisines as cuisinesTable, type HomeTileRow, homeTiles as homeTilesTable, storeCategories as storeCategoriesTable, type StoreRow } from './catalog.schema.js';
import { CatalogRepository, type Tx } from './catalog.repository.js';
import type {
  CategoryDto,
  CreateProductDto,
  CreateStoreDto,
  HomeTileDto,
  NamedImageDto,
  UpdateCategoryDto,
  UpdateHomeTileDto,
  UpdateNamedImageDto,
  UpdateProductDto,
  UpdateStoreDto,
} from './dto/catalog.dto.js';
import { toCategory, toCuisine, toHomeTile, toStoreInput, storeIsOpen } from './store-view.js';

const notFound = (what: string) => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', `No ${what} has this id`);

/**
 * The admin's catalog (contract §11 الموردين, المنتجات والكتالوج; §1.1 A6, A10–A12). Making a store
 * also makes its partner account, with a generated password shown once (§2).
 */
@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly users: UsersRepository,
  ) {}

  // Stores

  async listStores(meId: number, vertical?: Vertical): Promise<AdminStore[]> {
    return this.toAdminStores(await this.catalog.listStores({ vertical }), meId);
  }

  async getStore(meId: number, id: number): Promise<AdminStore> {
    const [store] = await this.toAdminStores([await this.storeOrThrow(id)], meId);
    return store!;
  }

  async createStore(meId: number, body: CreateStoreDto): Promise<CreatedStore> {
    const { partner, cuisineIds, ...fields } = body;
    if (await this.users.phoneInUse(partner.phone)) {
      throw new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
    }
    await this.assertCuisines(cuisineIds);
    const password = generatePassword();
    const { storeId, partnerId } = await this.catalog.createStoreWithPartner(fields, cuisineIds, {
      role: 'partner',
      phone: partner.phone,
      firstName: partner.firstName,
      lastName: partner.lastName ?? '',
      passwordHash: await hashPassword(password),
    });
    const account = toStaffAccount((await this.users.findLiveById(partnerId))!, meId);
    return { store: await this.getStore(meId, storeId), partner: { account, password } };
  }

  async updateStore(meId: number, id: number, body: UpdateStoreDto): Promise<AdminStore> {
    await this.storeOrThrow(id);
    const { cuisineIds, ...fields } = body;
    if (cuisineIds) await this.assertCuisines(cuisineIds);
    await this.catalog.updateStore(id, fields, cuisineIds);
    return this.getStore(meId, id);
  }

  private async toAdminStores(rows: StoreRow[], meId: number): Promise<AdminStore[]> {
    const ids = rows.map((r) => r.id);
    const [cuisineIds, productCounts, partners] = await Promise.all([
      this.catalog.cuisineIdsOf(ids),
      this.catalog.productCountsOf(ids),
      this.users.listLivePartnersOf(ids),
    ]);
    const now = new Date();
    return rows.map((row) => ({
      ...toStoreInput(row, cuisineIds.get(row.id) ?? []),
      id: row.id,
      isOpen: storeIsOpen(row, now),
      partners: partners.filter((p) => p.storeId === row.id).map((p) => toStaffAccount(p, meId)),
      productCount: productCounts.get(row.id) ?? 0,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private async storeOrThrow(id: number): Promise<StoreRow> {
    const row = await this.catalog.findStore(id);
    if (!row) throw notFound('store');
    return row;
  }

  private async assertCuisines(ids: number[]): Promise<void> {
    if ((await this.catalog.countCuisines(ids)) !== ids.length) throw notFound('cuisine');
  }

  // Categories

  async listCategories(storeId: number): Promise<Category[]> {
    await this.storeOrThrow(storeId);
    const [rows, counts] = await Promise.all([this.catalog.listCategories(storeId), this.catalog.categoryCounts(storeId)]);
    return rows.map((r) => toCategory(r, counts.get(r.id) ?? 0));
  }

  // Changes to one store's categories run one at a time (its store row is locked), so two of them at
  // the same moment cannot pass each other's checks: no loops, no sub-category of a deleted category.

  async createCategory(storeId: number, body: CategoryDto): Promise<Category> {
    await this.storeOrThrow(storeId);
    const id = await this.catalog.withStoreLocked(storeId, async (tx) => {
      if (body.parentId != null) await this.assertParent(storeId, body.parentId, tx);
      return this.catalog.createCategory(storeId, body, tx);
    });
    return this.category(id);
  }

  async updateCategory(id: number, body: UpdateCategoryDto): Promise<Category> {
    const { storeId } = await this.categoryOrThrow(id);
    await this.catalog.withStoreLocked(storeId, async (tx) => {
      if (body.parentId != null) {
        if (body.parentId === id || (await this.catalog.countSubcategories(id, tx))) throw depthError();
        await this.assertParent(storeId, body.parentId, tx);
      }
      await this.catalog.updateCategory(id, body, tx);
    });
    return this.category(id);
  }

  async deleteCategory(id: number): Promise<void> {
    const { storeId } = await this.categoryOrThrow(id);
    const notEmpty = () => new ApiException(HttpStatus.CONFLICT, 'CATEGORY_NOT_EMPTY', 'Move or delete its products and sub-categories first');
    await this.catalog
      .withStoreLocked(storeId, async (tx) => {
        if ((await this.catalog.categoryCounts(storeId, false, tx)).get(id) || (await this.catalog.countSubcategories(id, tx))) throw notEmpty();
        await this.catalog.deleteCategory(id, tx);
      })
      .catch((err: unknown) => {
        // A product added at that moment still holds the category (its key refuses the delete).
        throw isForeignKeyRefusal(err) ? notEmpty() : err;
      });
  }

  /** A main category of the same store: sub-categories are one level deep (§8.4). */
  private async assertParent(storeId: number, parentId: number, tx?: Tx): Promise<void> {
    const parent = await this.catalog.findCategory(parentId, tx);
    if (!parent) throw notFound('category');
    if (parent.storeId !== storeId) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'CATEGORY_OTHER_STORE', 'That category belongs to another store');
    }
    if (parent.parentId !== null) throw depthError();
  }

  async orderCategories(storeId: number, ids: number[]): Promise<Category[]> {
    const rows = await this.catalog.listCategories(storeId);
    assertSameIds(
      rows.map((r) => r.id),
      ids,
    );
    await this.catalog.setOrder(storeCategoriesTable, ids);
    return this.listCategories(storeId);
  }

  private async category(id: number): Promise<Category> {
    const row = (await this.catalog.findCategory(id))!;
    return toCategory(row, (await this.catalog.categoryCounts(row.storeId)).get(id) ?? 0);
  }

  private async categoryOrThrow(id: number) {
    const row = await this.catalog.findCategory(id);
    if (!row) throw notFound('category');
    return row;
  }

  // Products

  async listProducts(storeId: number): Promise<Product[]> {
    await this.storeOrThrow(storeId);
    return this.catalog.withChoices(await this.catalog.listProducts(storeId));
  }

  async listInactiveProducts(): Promise<AdminProduct[]> {
    const rows = await this.catalog.listInactiveProducts();
    const products = await this.catalog.withChoices(rows.map((r) => r.product));
    return rows.map((r, i) => ({ ...products[i]!, storeName: r.storeName, categoryName: r.categoryName }));
  }

  async createProduct(storeId: number, body: CreateProductDto): Promise<Product> {
    await this.storeOrThrow(storeId);
    await this.assertCategoryOf(storeId, body.categoryId);
    const { optionGroups, ingredients, ...fields } = body;
    assertGroups(optionGroups);
    const id = await this.catalog.createProduct({ ...fields, storeId }, { optionGroups, ingredients });
    return this.product(id);
  }

  async updateProduct(id: number, body: UpdateProductDto): Promise<Product> {
    const row = await this.catalog.findProduct(id);
    if (!row) throw notFound('product');
    if (body.categoryId !== undefined) await this.assertCategoryOf(row.storeId, body.categoryId);
    const { optionGroups, ingredients, ...fields } = body;
    assertGroups(optionGroups);
    // The dashboard sends the choices on every save; rewriting unchanged ones would give them new
    // ids, and carts point at those ids.
    const [current] = await this.catalog.withChoices([row]);
    const keepGroups = optionGroups && sameGroups(current!.optionGroups, optionGroups);
    const keepIngredients = ingredients && sameList(current!.ingredients.map((i) => i.name), ingredients);
    await this.catalog.updateProduct(id, fields, {
      optionGroups: keepGroups ? undefined : optionGroups,
      ingredients: keepIngredients ? undefined : ingredients,
    });
    return this.product(id);
  }

  private async product(id: number): Promise<Product> {
    const [product] = await this.catalog.withChoices([(await this.catalog.findProduct(id))!]);
    return product!;
  }

  async deleteProduct(id: number): Promise<void> {
    if (!(await this.catalog.findProduct(id))) throw notFound('product');
    await this.catalog.deleteProduct(id);
  }

  private async assertCategoryOf(storeId: number, categoryId: number): Promise<void> {
    const category = await this.catalog.findCategory(categoryId);
    if (!category) throw notFound('category');
    if (category.storeId !== storeId) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'CATEGORY_OTHER_STORE', 'That category belongs to another store');
    }
  }

  // Cuisines

  async listCuisines(): Promise<Cuisine[]> {
    return (await this.catalog.listCuisines()).map(toCuisine);
  }

  async createCuisine(body: NamedImageDto): Promise<Cuisine> {
    return toCuisine((await this.catalog.findCuisine(await this.catalog.createCuisine(body)))!);
  }

  async updateCuisine(id: number, body: UpdateNamedImageDto): Promise<Cuisine> {
    if (!(await this.catalog.findCuisine(id))) throw notFound('cuisine');
    await this.catalog.updateCuisine(id, body);
    return toCuisine((await this.catalog.findCuisine(id))!);
  }

  async deleteCuisine(id: number): Promise<void> {
    if (!(await this.catalog.findCuisine(id))) throw notFound('cuisine');
    await this.catalog.deleteCuisine(id);
  }

  async orderCuisines(ids: number[]): Promise<Cuisine[]> {
    assertSameIds(
      (await this.catalog.listCuisines()).map((r) => r.id),
      ids,
    );
    await this.catalog.setOrder(cuisinesTable, ids);
    return this.listCuisines();
  }

  // Home tiles

  async listHomeTiles(): Promise<HomeTile[]> {
    return (await this.catalog.listHomeTiles()).map(toHomeTile);
  }

  async createHomeTile(body: HomeTileDto): Promise<HomeTile> {
    const target = await this.tileTarget(body.targetVertical ?? null, body.targetStoreId ?? null);
    const id = await this.catalog.createHomeTile({ label: body.label, image: body.image ?? null, badge: body.badge ?? null, row: body.row, ...target });
    return toHomeTile((await this.catalog.findHomeTile(id))!);
  }

  async updateHomeTile(id: number, body: UpdateHomeTileDto): Promise<HomeTile> {
    const row = await this.tileOrThrow(id);
    const { targetVertical, targetStoreId, ...rest } = body;
    const values: Partial<HomeTileRow> = { ...rest };
    if (targetVertical !== undefined || targetStoreId !== undefined) {
      Object.assign(
        values,
        await this.tileTarget(
          targetVertical === undefined ? row.targetVertical : targetVertical,
          targetStoreId === undefined ? row.targetStoreId : targetStoreId,
        ),
      );
    }
    await this.catalog.updateHomeTile(id, values);
    return toHomeTile((await this.catalog.findHomeTile(id))!);
  }

  async deleteHomeTile(id: number): Promise<void> {
    await this.tileOrThrow(id);
    await this.catalog.deleteHomeTile(id);
  }

  /** The new order of the tiles of both rows; each row keeps its own sequence. */
  async orderHomeTiles(ids: number[]): Promise<HomeTile[]> {
    assertSameIds(
      (await this.catalog.listHomeTiles()).map((r) => r.id),
      ids,
    );
    await this.catalog.setOrder(homeTilesTable, ids);
    return this.listHomeTiles();
  }

  /** A tile opens exactly one vertical or one existing store (§8.2). */
  private async tileTarget(targetVertical: Vertical | null, targetStoreId: number | null) {
    if ((targetVertical === null) === (targetStoreId === null)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'TILE_TARGET', 'Set either targetVertical or targetStoreId');
    }
    if (targetStoreId !== null) await this.storeOrThrow(targetStoreId);
    return { targetVertical, targetStoreId };
  }

  private async tileOrThrow(id: number): Promise<HomeTileRow> {
    const row = await this.catalog.findHomeTile(id);
    if (!row) throw notFound('home tile');
    return row;
  }
}

const depthError = () => new ApiException(HttpStatus.BAD_REQUEST, 'CATEGORY_DEPTH', 'Sub-categories are one level deep');

/** MySQL's 1451: a row another row still points at (drizzle keeps the driver's error as the cause). */
function isForeignKeyRefusal(err: unknown): boolean {
  const errno = (e: unknown) => (e as { errno?: number } | undefined)?.errno;
  return errno(err) === 1451 || errno((err as { cause?: unknown } | undefined)?.cause) === 1451;
}

/** A group can never ask for more choices than it has rows. */
const sameList = (a: unknown[], b: unknown[]) => JSON.stringify(a) === JSON.stringify(b);

/** Whether the sent option groups are the stored ones, in the same order. */
function sameGroups(stored: OptionGroup[], sent: ProductOptionsInput['optionGroups']): boolean {
  const shape = (groups: ProductOptionsInput['optionGroups']) =>
    groups.map((g) => ({ t: g.title, r: g.required, m: g.maxChoices, o: g.options.map((o) => [o.name, Number(o.priceDelta)]) }));
  return sameList(shape(stored), shape(sent));
}

function assertGroups(groups: { maxChoices: number; options: unknown[] }[] | undefined): void {
  if (groups?.some((g) => g.maxChoices > g.options.length)) {
    throw new ApiException(HttpStatus.BAD_REQUEST, 'OPTION_GROUP', 'maxChoices is more than the group has options');
  }
}

/** A new order must name every row of the list exactly once. */
function assertSameIds(existing: number[], ids: number[]): void {
  const want = [...existing].sort((a, b) => a - b).join(',');
  const got = [...ids].sort((a, b) => a - b).join(',');
  if (want !== got) throw new BadRequestException('ids must list every row of the list exactly once');
}
