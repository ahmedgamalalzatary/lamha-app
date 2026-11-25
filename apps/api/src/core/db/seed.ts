// `pnpm db:seed` (from apps/api): accounts to try the apps with, and the demo's stores as the catalog.
// Safe to run twice: an existing phone is skipped, and the catalog is only added to a database with no stores.
import { copyFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { createConnection } from 'mysql2/promise';
import { defaultLayout, type Role, type TileRow, UPLOADS_DIR, type Vertical } from '@tawsela/shared';
import { hashPassword } from '../../modules/auth/password.js';
import {
  cuisines,
  homeTiles,
  productIngredients,
  productOptionGroups,
  productOptions,
  products,
  storeCategories,
  storeCuisines,
  stores,
} from '../../modules/catalog/catalog.schema.js';
import { users } from '../../modules/users/users.schema.js';
import { zones } from '../../modules/addresses/addresses.schema.js';

config({ path: '../../.env', quiet: true });

// Try-out accounts share one known password: never on the live server (review F61).
if (process.env.NODE_ENV === 'production') {
  throw new Error('The seed makes try-out accounts with a shared password; it does not run in production');
}

const url = process.env.DATABASE_URL;
const password = process.env.SEED_PASSWORD;
if (!url || !password) throw new Error('DATABASE_URL and SEED_PASSWORD must be set in the root .env');

/** Partners and drivers are normally created by an admin (Phases 4 and 12); these are for trying the apps. */
const ACCOUNTS: { role: Role; phone: string; firstName: string; lastName?: string }[] = [
  { role: 'admin', phone: '01000000001', firstName: 'مدير توصيلة' },
  { role: 'partner', phone: '01000000002', firstName: 'مورد تجريبي' },
  { role: 'driver', phone: '01000000003', firstName: 'مندوب تجريبي' },
  // Phase 3: more admins, so حسابات الإدارة has rows to reset and disable.
  { role: 'admin', phone: '01000000004', firstName: 'سارة', lastName: 'علي' },
  { role: 'admin', phone: '01000000005', firstName: 'محمود', lastName: 'حسن' },
];

/** The demo's synthetic stores and menus (apps/demo/src/lib/data/stores.ts); choices are added below. */
interface SeedCatalog {
  cuisines: { key: string; name: string; image: string | null }[];
  stores: {
    key: string;
    vertical: Vertical;
    name: string;
    cover: string | null;
    deliveryMinutes: number;
    minimumOrder: number;
    deliveredBy: 'platform' | 'store';
    open: boolean;
    cuisines: string[];
    categories: { name: string; products: { name: string; description: string | null; price: number; unit: string | null; image: string | null }[] }[];
  }[];
}

/** Demo choices in Tawsilty's patterns (§8.5): a required "اختر 1" group, extras, removable ingredients. */
const CHOICES: {
  store: string;
  product: string;
  /** 0 makes the price come from the choice ("السعر حسب الاختيار"). */
  price?: number;
  groups?: { title: string; required: boolean; maxChoices: number; options: [string, number][] }[];
  ingredients?: string[];
}[] = [
  { store: 'شاورما الساقية', product: 'شاورما فراخ', ingredients: ['ثومية', 'مخلل', 'بطاطس'] },
  {
    store: 'شاورما الساقية',
    product: 'وجبة شاورما فراخ عربي',
    groups: [{ title: 'الحجم', required: true, maxChoices: 1, options: [['عادي', 0], ['كبير', 40]] }],
  },
  {
    store: 'سماش لاب',
    product: 'كلاسيك سماش',
    groups: [{ title: 'إضافات', required: false, maxChoices: 2, options: [['جبنة شيدر', 20], ['بيكون', 35], ['هالبينو', 10]] }],
    ingredients: ['خس', 'طماطم', 'بصل', 'صوص سماش'],
  },
  {
    store: 'توصيلة ماركت',
    product: 'موز',
    price: 0,
    groups: [{ title: 'الوزن', required: true, maxChoices: 1, options: [['نصف كيلو', 19], ['كيلو', 38]] }],
  },
];

/** The market's category page shows sub-categories as circles (§8.4). */
const SUBCATEGORIES: { store: string; parent: string; children: Record<string, string[]> }[] = [
  { store: 'توصيلة ماركت', parent: 'خضار وفاكهة', children: { الخضار: ['طماطم', 'خضار سلطة مشكل'], الفاكهة: ['موز', 'سلة فاكهة الموسم'] } },
];

/** The demo's photos (Unsplash, listed in apps/demo/public/img/SOURCES.json). */
const DEMO_IMAGES = path.resolve('../demo/public/img');
const SEED_IMAGES = path.resolve(UPLOADS_DIR, 'seed');

/** Copies a demo photo into uploads/seed and returns its served path. */
async function image(name: string | null): Promise<string | null> {
  if (!name) return null;
  await copyFile(path.join(DEMO_IMAGES, name), path.join(SEED_IMAGES, name));
  return `/uploads/seed/${name}`;
}

const conn = await createConnection({ uri: url });
const db = drizzle({ client: conn });

const passwordHash = await hashPassword(password);
for (const account of ACCOUNTS) {
  const [res] = await db.insert(users).ignore().values({ ...account, passwordHash });
  console.log(`${account.role} ${account.phone}: ${res.affectedRows ? 'created' : 'already there'}`);
}

const [anyStore] = await db.select({ id: stores.id }).from(stores).limit(1);
if (anyStore) {
  console.log('catalog: already there');
} else {
  await mkdir(SEED_IMAGES, { recursive: true });
  const data = JSON.parse(readFileSync('src/core/db/seed-catalog.json', 'utf8')) as SeedCatalog;

  // One transaction: a run that fails half way leaves nothing behind, so it can simply run again.
  await db.transaction(async (tx) => {
    const cuisineIds = new Map<string, number>();
    for (const [i, c] of data.cuisines.entries()) {
      const [row] = await tx
        .insert(cuisines)
        .values({ name: c.name, image: await image(c.image), sortOrder: i })
        .$returningId();
      cuisineIds.set(c.key, row!.id);
    }

    const storeIds = new Map<string, number>();
    for (const s of data.stores) {
      // Open stores are open all day so the apps can be tried at any hour; a closed one shows "مغلق".
      const [row] = await tx
        .insert(stores)
        .values({
          vertical: s.vertical,
          name: s.name,
          cover: await image(s.cover),
          deliveryMinutes: s.deliveryMinutes,
          minimumOrder: s.minimumOrder,
          deliveredBy: s.deliveredBy,
          layout: defaultLayout(s.vertical),
          opensAt: s.open ? '00:00' : '12:00',
          closesAt: s.open ? '00:00' : '23:00',
          closedNow: !s.open,
        })
        .$returningId();
      const storeId = row!.id;
      storeIds.set(s.key, storeId);
      for (const key of s.cuisines) await tx.insert(storeCuisines).values({ storeId, cuisineId: cuisineIds.get(key)! });
      for (const [ci, c] of s.categories.entries()) {
        const [cat] = await tx.insert(storeCategories).values({ storeId, name: c.name, sortOrder: ci }).$returningId();
        for (const [pi, p] of c.products.entries()) {
          await tx.insert(products).values({ storeId, categoryId: cat!.id, ...p, image: await image(p.image), sortOrder: pi });
        }
      }
    }

    // Send anything (contract §8.12): an ordinary store with one 1 ج.م product. [Open] The terms text
    // after its first line is not captured; the admin writes it.
    const [courier] = await tx
      .insert(stores)
      .values({
        vertical: 'courier',
        name: 'اطلب دليفري',
        deliveryMinutes: 30,
        minimumOrder: 0,
        layout: 'list',
        opensAt: '00:00',
        closesAt: '00:00',
      })
      .$returningId();
    const [moto] = await tx.insert(storeCategories).values({ storeId: courier!.id, name: 'موتوسيكل' }).$returningId();
    await tx.insert(products).values({
      storeId: courier!.id,
      categoryId: moto!.id,
      name: 'اطلب دليفري',
      description: 'الشروط والأحكام الخاصة بخدمة التوصيل (Delivery) داخل تطبيق "توصيلة":',
      price: 1,
    });

    // Home tiles in Tawsilty's pattern (§8.2): a fixed first row, a sideways second row mixing verticals and pinned stores.
    const tiles: { label: string; row: TileRow; image: string; badge?: string; targetVertical?: Vertical; store?: string }[] = [
      { label: 'المطاعم', row: 'fixed', image: 'burger1.jpg', targetVertical: 'restaurant' },
      { label: 'ماركت', row: 'fixed', image: 'market1.jpg', targetVertical: 'market' },
      { label: 'خضار وفاكهة', row: 'fixed', image: 'vegetables1.jpg', store: 'lamha-mart' },
      { label: 'توصيلة ماركت', row: 'fixed', image: 'milk1.jpg', store: 'lamha-mart' },
      { label: 'حلويات', row: 'scroll', image: 'kunafa1.jpg', store: 'qarun-sweets' },
      { label: 'صيدليات', row: 'scroll', image: 'pharmacy1.jpg', targetVertical: 'pharmacy' },
      { label: 'اطلب دليفري', row: 'scroll', image: 'shrimp1.jpg', badge: 'سريع', targetVertical: 'courier' },
      { label: 'شاورما الساقية', row: 'scroll', image: 'shawarma1.jpg', store: 'sakia-shawarma' },
      { label: 'سماش لاب', row: 'scroll', image: 'burger3.jpg', store: 'smash-lab' },
    ];
    for (const [i, t] of tiles.entries()) {
      await tx.insert(homeTiles).values({
        label: t.label,
        row: t.row,
        image: await image(t.image),
        badge: t.badge ?? null,
        sortOrder: i,
        targetVertical: t.targetVertical ?? null,
        targetStoreId: t.store ? storeIds.get(t.store)! : null,
      });
    }
    console.log(`catalog: ${data.stores.length + 1} stores, ${data.cuisines.length} cuisines, ${tiles.length} home tiles`);
  });
}

// Phase 7: product choices and sub-categories on a few demo items, so the product sheet and the
// market's category page have something to show. Each step skips what is already there.
const storeId = async (name: string) => (await db.select({ id: stores.id }).from(stores).where(eq(stores.name, name)))[0]?.id;

for (const c of CHOICES) {
  const sid = await storeId(c.store);
  if (!sid) continue;
  const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.storeId, sid), eq(products.name, c.product)));
  if (!product) continue;
  const [hasGroup] = await db.select({ id: productOptionGroups.id }).from(productOptionGroups).where(eq(productOptionGroups.productId, product.id)).limit(1);
  const [hasIngredient] = await db.select({ id: productIngredients.id }).from(productIngredients).where(eq(productIngredients.productId, product.id)).limit(1);
  if (hasGroup || hasIngredient) continue;
  if (c.price !== undefined) await db.update(products).set({ price: c.price }).where(eq(products.id, product.id));
  for (const [gi, g] of (c.groups ?? []).entries()) {
    const [group] = await db
      .insert(productOptionGroups)
      .values({ productId: product.id, title: g.title, required: g.required, maxChoices: g.maxChoices, sortOrder: gi })
      .$returningId();
    await db.insert(productOptions).values(g.options.map(([name, priceDelta], oi) => ({ groupId: group!.id, name, priceDelta, sortOrder: oi })));
  }
  if (c.ingredients?.length) await db.insert(productIngredients).values(c.ingredients.map((name, i) => ({ productId: product.id, name, sortOrder: i })));
  console.log(`choices: ${c.product}`);
}

for (const s of SUBCATEGORIES) {
  const sid = await storeId(s.store);
  if (!sid) continue;
  const [parent] = await db.select().from(storeCategories).where(and(eq(storeCategories.storeId, sid), eq(storeCategories.name, s.parent)));
  if (!parent || parent.parentId !== null) continue;
  const [already] = await db.select({ id: storeCategories.id }).from(storeCategories).where(eq(storeCategories.parentId, parent.id)).limit(1);
  if (already) continue;
  for (const [i, [name, items]] of Object.entries(s.children).entries()) {
    const [child] = await db
      .insert(storeCategories)
      .values({ storeId: sid, parentId: parent.id, name, sortOrder: parent.sortOrder + i + 1 })
      .$returningId();
    for (const item of items) {
      await db
        .update(products)
        .set({ categoryId: child!.id })
        .where(and(eq(products.categoryId, parent.id), eq(products.name, item)));
    }
  }
  console.log(`sub-categories: ${s.parent}`);
}

// The seeded partner runs the first store (contract §2: a partner belongs to a store).
const [first] = await db.select({ id: stores.id }).from(stores).orderBy(stores.id).limit(1);
if (first) {
  await db
    .update(users)
    .set({ storeId: first.id })
    .where(and(eq(users.phone, '01000000002'), isNull(users.storeId)));
}

// Phase 8: one delivery zone around Fayoum city (Tawsilty's area, §8.9), holding every store that has
// none, each placed at its own spot in the city so "الأقرب إليك" has distances to sort by.
const [anyZone] = await db.select({ id: zones.id }).from(zones).limit(1);
if (!anyZone) {
  const FAYOUM = { lat: 29.3084, lng: 30.8428 };
  const [zone] = await db
    .insert(zones)
    .values({
      name: 'الفيوم',
      polygon: [
        { lat: 29.27, lng: 30.79 },
        { lat: 29.35, lng: 30.79 },
        { lat: 29.35, lng: 30.89 },
        { lat: 29.27, lng: 30.89 },
      ],
    })
    .$returningId();
  const unzoned = await db.select({ id: stores.id }).from(stores).where(isNull(stores.zoneId));
  for (const { id } of unzoned) {
    const lat = FAYOUM.lat + ((id % 5) - 2) * 0.006;
    const lng = FAYOUM.lng + ((Math.floor(id / 5) % 5) - 2) * 0.006;
    await db.update(stores).set({ zoneId: zone!.id, lat, lng }).where(eq(stores.id, id));
  }
  console.log(`zones: الفيوم with ${unzoned.length} stores`);
}
await conn.end();
