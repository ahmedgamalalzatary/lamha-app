import { type Category, productSaving, type StorePage } from '@tawsela/shared';
import { Image } from 'expo-image';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { type ComponentRef, type ReactNode, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { mediaUrl } from '@/core/api/client';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useFavorites, useStorePage, useToggleFavorite } from '../api/store';
import { CartBar } from '../components/CartBar';
import { CategoriesSheet } from '../components/CategoriesSheet';
import { CategoryTabs, TABS_HEIGHT } from '../components/CategoryTabs';
import { NoProducts } from '../components/NoProducts';
import { OfferCards } from '../components/OfferCards';
import { ProductCard, type ProductActions, ProductRow } from '../components/ProductItems';
import { VouchersSheet } from '@/features/offers/VouchersSheet';
import { ProductSheet } from '../components/ProductSheet';
import { SectionTitle } from '../components/SectionTitle';
import { COVER_HEIGHT, StoreHeader } from '../components/StoreHeader';
import { BAR_HEIGHT, StoreTopBar } from '../components/StoreTopBar';
import { useProductTaps } from '../hooks/useProductTaps';

/** Room under the content for the bottom bar. */
const BOTTOM_ROOM = 140;

/**
 * A store page (contract §8.4). The admin's layout decides the body: the restaurant layout lists the
 * products under sticky category tabs; the market layout shows the "الأقسام" grid, each opening its
 * category page. The bottom bar shows the minimum order, then the cart. The offer cards sit under the
 * info row (Phase 20); the market layout lists its discounted products in "العروض" over its categories.
 * [Open] The market's themed rails (banner + products) are not built.
 */
export function StoreScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; product?: string }>();
  const storeId = Number(params.id);
  const linkedId = params.product ? Number(params.product) : undefined;
  const [linkOpen, setLinkOpen] = useState(true);
  const page = useStorePage(storeId);
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const { cart, actions, sheet, setSheet, conflict } = useProductTaps(storeId);
  const [solid, setSolid] = useState(false);
  const [vouchersOpen, setVouchersOpen] = useState(false);

  const isFavorite = favorites.data?.some((s) => s.id === storeId) ?? false;
  const store = page.data;
  const menu = store?.categories.flatMap((c) => c.products) ?? [];

  /** The bar turns white with the name once the cover has scrolled under it. */
  const trackCover = (y: number) => {
    const next = y > COVER_HEIGHT - BAR_HEIGHT - insets.top;
    if (next !== solid) setSolid(next);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => trackCover(e.nativeEvent.contentOffset.y);

  if (!store) {
    return (
      <View style={styles.screen}>
        {page.isError ? (
          <View style={[styles.errorBox, { paddingTop: insets.top + BAR_HEIGHT + spacing.lg }]}>
            <AppText color={colors.danger}>{errorMessage(page.error)}</AppText>
            <Button label={t('common.retry')} variant="soft" onPress={() => void page.refetch()} />
          </View>
        ) : (
          <View>
            <Skeleton style={{ height: COVER_HEIGHT, borderRadius: 0 }} />
            <View style={styles.skeletonRows}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} style={{ height: 96, borderRadius: radius.md }} />
              ))}
            </View>
          </View>
        )}
        <StoreTopBar title="" solid={false} />
      </View>
    );
  }

  const favorite = {
    on: isFavorite,
    busy: toggle.isPending || favorites.isPending,
    // A failed heart says so instead of looking like an ignored tap (review F44).
    onPress: () => toggle.mutate({ storeId, on: !isFavorite }, { onError: (e) => toast.show(errorMessage(e), 'error') }),
  };
  // A search result opens the store on its product (review F81) until that sheet is closed.
  const linked = linkOpen && linkedId ? menu.find((p) => p.id === linkedId) : undefined;
  const shown = sheet ?? linked ?? null;
  const closeSheet = () => {
    setLinkOpen(false);
    setSheet(null);
  };

  return (
    <View style={styles.screen}>
      {store.layout === 'list' ? (
        <MenuList
          store={store}
          actions={actions}
          solid={solid}
          onScrollY={trackCover}
          onVouchers={() => setVouchersOpen(true)}
          renderTopBar={(tabs) => (
            <StoreTopBar title={store.name} solid={solid} favorite={favorite} onSearch={() => router.push(`/store/${storeId}/search` as Href)}>
              {tabs}
            </StoreTopBar>
          )}
        />
      ) : (
        <>
          <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: BOTTOM_ROOM }}>
            <StoreHeader store={store} />
            <OfferCards store={store} onVouchers={() => setVouchersOpen(true)} />
            <Deals store={store} actions={actions} />
            <CategoryGrid store={store} />
          </ScrollView>
          <StoreTopBar title={store.name} solid={solid} favorite={favorite} onSearch={() => router.push(`/store/${storeId}/search` as Href)} />
        </>
      )}
      <CartBar count={cart.count} total={cart.total} minimumOrder={store.minimumOrder} />
      <ProductSheet product={shown} conflict={conflict} menu={menu} countOf={cart.countOf} onAdd={cart.add} onOpen={setSheet} onClose={closeSheet} />
      <VouchersSheet visible={vouchersOpen} vouchers={store.vouchers} onClose={() => setVouchersOpen(false)} />
    </View>
  );
}

/**
 * The restaurant layout: header, category tabs (pinned under the bar once scrolled to), then each
 * category's products as a list. A tab or a ☰ row scrolls to its category.
 */
function MenuList({
  store,
  actions,
  solid,
  onScrollY,
  onVouchers,
  renderTopBar,
}: {
  store: StorePage;
  actions: ProductActions;
  solid: boolean;
  /** Hands each scroll offset to the screen (the bar over the cover). */
  onScrollY: (y: number) => void;
  onVouchers: () => void;
  renderTopBar: (tabs: ReactNode) => ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const sections = store.categories.filter((c) => c.products.length > 0);
  const [active, setActive] = useState(sections[0]?.id);
  const [pinned, setPinned] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const tabsY = useRef(0);
  const sectionY = useRef(new Map<number, number>());
  const topOffset = insets.top + BAR_HEIGHT + TABS_HEIGHT;

  // Pin the tabs once they reach the bar, and follow the category in view.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    onScrollY(y);
    const nextPinned = y >= tabsY.current - insets.top - BAR_HEIGHT;
    if (nextPinned !== pinned) setPinned(nextPinned);
    let current = sections[0]?.id;
    for (const s of sections) if ((sectionY.current.get(s.id) ?? Infinity) <= y + topOffset + 1) current = s.id;
    if (current !== active) setActive(current);
  };

  const goTo = (id: number) => {
    setActive(id);
    const y = sectionY.current.get(id);
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - topOffset), animated: true });
  };

  const tabs = <CategoryTabs categories={sections} active={active} onSelect={goTo} onAll={() => setSheetOpen(true)} />;

  return (
    <>
      <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: BOTTOM_ROOM }}>
        <StoreHeader store={store} />
        <OfferCards store={store} onVouchers={onVouchers} />
        {sections.length ? (
          <View onLayout={(e) => (tabsY.current = e.nativeEvent.layout.y)}>{tabs}</View>
        ) : (
          <NoProducts />
        )}
        {sections.map((c) => (
          <View key={c.id} onLayout={(e) => sectionY.current.set(c.id, e.nativeEvent.layout.y)}>
            <SectionTitle title={c.name} />
            {c.products.map((p) => (
              <ProductRow key={p.id} product={p} actions={actions} />
            ))}
          </View>
        ))}
      </ScrollView>
      {renderTopBar(solid && pinned ? tabs : null)}
      <CategoriesSheet
        visible={sheetOpen}
        title={store.name}
        categories={sections.map((c) => ({ id: c.id, name: c.name, count: c.products.length }))}
        active={active}
        onPick={(id) => {
          setSheetOpen(false);
          goTo(id);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

/** The market layout's "العروض" (§8.4): its discounted products side by side; "عرض الكل" opens them as one grid. */
function Deals({ store, actions }: { store: StorePage; actions: ProductActions }) {
  const t = useT();
  const deals = store.categories.flatMap((c) => c.products).filter((p) => p.active && productSaving(p) > 0);
  if (!deals.length) return null;
  return (
    <View testID="store-deals" style={styles.deals}>
      <View style={styles.dealsHead}>
        <SectionTitle title={t('offers.deals')} bar={false} />
        <PressableScale accessibilityRole="button" accessibilityLabel={t('offers.seeAll')} onPress={() => router.push(`/store/${store.id}/products?offers=1` as Href)} hitSlop={8}>
          <AppText weight="semibold" style={styles.underline}>
            {t('offers.seeAll')}
          </AppText>
        </PressableScale>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealsRow}>
        {deals.map((p) => (
          <ProductCard key={p.id} product={p} actions={actions} width={DEAL_WIDTH} />
        ))}
      </ScrollView>
    </View>
  );
}

const DEAL_WIDTH = 150;

/** The market layout's "الأقسام" (contract §8.4): main categories as pictures; each opens its page. */
function CategoryGrid({ store }: { store: StorePage }) {
  const t = useT();
  const mains = store.categories.filter((c) => c.parentId === null);
  if (!mains.length) return <NoProducts />;
  const rows: Category[][] = [];
  for (let i = 0; i < mains.length; i += 3) rows.push(mains.slice(i, i + 3));
  return (
    <View>
      <SectionTitle title={t('store.categories')} bar={false} />
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row[0]!.id} style={styles.gridRow}>
            {row.map((c) => (
              <CategoryTile key={c.id} storeId={store.id} category={c} />
            ))}
            {Array.from({ length: 3 - row.length }, (_, i) => (
              <View key={`gap${i}`} style={styles.tile} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function CategoryTile({ storeId, category }: { storeId: number; category: Category }) {
  const uri = mediaUrl(category.image);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={category.name}
      onPress={() => router.push(`/store/${storeId}/category/${category.id}` as Href)}
      scaleTo={0.97}
      style={styles.tile}
    >
      <View style={styles.tileImage}>{uri ? <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <LayoutGrid size={32} color={colors.line} />}</View>
      <AppText weight="semibold" size={fontSizes.body} numberOfLines={2} style={styles.center}>
        {category.name}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  errorBox: { padding: spacing.lg, gap: spacing.md },
  skeletonRows: { padding: spacing.lg, gap: spacing.md },
  grid: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  gridRow: { flexDirection: 'row', gap: spacing.lg },
  tile: { flex: 1, gap: spacing.sm, alignItems: 'center' },
  tileImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  deals: { gap: spacing.sm, marginBottom: spacing.lg },
  dealsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingEnd: spacing.lg },
  dealsRow: { gap: spacing.md, paddingHorizontal: spacing.lg },
  underline: { textDecorationLine: 'underline' },
});
