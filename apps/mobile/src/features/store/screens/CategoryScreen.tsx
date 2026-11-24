import type { Category, Product } from '@tawsela/shared';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, LayoutGrid, Search, SearchX } from 'lucide-react-native';
import { type ComponentRef, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { mediaUrl } from '@/core/api/client';
import { useT } from '@/core/i18n';
import { colors, fonts, fontSizes, radius, spacing } from '@/core/theme';
import { useStorePage } from '../api/store';
import { CartBar } from '../components/CartBar';
import { ProductGrid } from '../components/ProductItems';
import { ProductSheet } from '../components/ProductSheet';
import { SectionTitle } from '../components/SectionTitle';
import { useProductTaps } from '../hooks/useProductTaps';

const matches = (q: string) => {
  const needle = q.trim().toLowerCase();
  return (p: Product) => !needle || p.name.toLowerCase().includes(needle);
};

/**
 * A category page (contract §8.4 market-category-subcategory-circles-grid): back, the title, a
 * product search, the sub-category circles (الكل first) and the products as a grid. With الكل each
 * sub-category is its own section.
 */
export function CategoryScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ id: string; categoryId: string }>();
  const storeId = Number(params.id);
  const page = useStorePage(storeId);
  const { cart, actions, sheet, setSheet } = useProductTaps(storeId);
  const [q, setQ] = useState('');
  const [sub, setSub] = useState<number | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  const store = page.data;
  const category = store?.categories.find((c) => c.id === Number(params.categoryId));
  const children = category ? store!.categories.filter((c) => c.parentId === category.id) : [];
  const title = category?.name ?? '';
  const keep = matches(q);

  // What the page lists: one grid, or (الكل with sub-categories) a section per category.
  let sections: { key: number; title?: string; products: Product[] }[] = [];
  if (category && sub !== null) sections = [{ key: sub, products: (children.find((c) => c.id === sub)?.products ?? []).filter(keep) }];
  else if (category) {
    const own = { key: category.id, title: children.length ? category.name : undefined, products: category.products.filter(keep) };
    sections = [own, ...children.map((c) => ({ key: c.id, title: c.name, products: c.products.filter(keep) }))];
  }
  sections = sections.filter((s) => s.products.length > 0);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.bar}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} scaleTo={0.9} style={styles.round}>
          <ChevronRight size={24} color={colors.ink} />
        </PressableScale>
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle} numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('store.search')} onPress={() => input.current?.focus()} scaleTo={0.9} style={styles.round}>
          <Search size={22} color={colors.ink} />
        </PressableScale>
      </View>

      {!store ? (
        page.isError ? (
          <View style={styles.errorBox}>
            <AppText color={colors.danger}>{errorMessage(page.error)}</AppText>
            <Button label={t('common.retry')} variant="soft" onPress={() => void page.refetch()} />
          </View>
        ) : (
          <View style={styles.errorBox}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} style={{ height: 120, borderRadius: radius.lg }} />
            ))}
          </View>
        )
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.search}>
            <Search size={20} color={colors.ink2} />
            <TextInput
              ref={input}
              value={q}
              onChangeText={setQ}
              accessibilityLabel={t('store.search')}
              placeholder={t('store.search')}
              placeholderTextColor={colors.ink2}
              returnKeyType="search"
              style={styles.input}
            />
          </View>
          {children.length ? <Circles parent={category!} items={children} selected={sub} onSelect={setSub} /> : null}
          {sections.length ? (
            sections.map((s) => (
              <View key={s.key} style={styles.section}>
                {s.title ? <SectionTitle title={s.title} bar={false} /> : null}
                <ProductGrid products={s.products} actions={actions} />
              </View>
            ))
          ) : (
            <EmptyState icon={SearchX} title={q.trim() ? t('store.noMatch') : t('store.empty')} />
          )}
        </ScrollView>
      )}

      {store ? (
        <>
          <CartBar count={cart.count} total={cart.total} minimumOrder={store.minimumOrder} />
          <ProductSheet
            product={sheet}
            menu={store.categories.flatMap((c) => c.products)}
            countOf={cart.countOf}
            onAdd={cart.add}
            onOpen={setSheet}
            onClose={() => setSheet(null)}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

/** Sub-category circles: الكل, then each sub-category; the chosen one has a dark ring. */
function Circles({ parent, items, selected, onSelect }: { parent: Category; items: Category[]; selected: number | null; onSelect: (id: number | null) => void }) {
  const t = useT();
  const all = [{ id: null, name: t('store.all'), image: parent.image }, ...items.map((c) => ({ id: c.id as number | null, name: c.name, image: c.image }))];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={styles.circles}>
      {all.map((c) => {
        const on = c.id === selected;
        const uri = mediaUrl(c.image);
        return (
          <PressableScale
            key={c.id ?? 'all'}
            accessibilityRole="tab"
            accessibilityLabel={c.name}
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(c.id)}
            scaleTo={0.95}
            style={styles.circleItem}
          >
            <View style={[styles.circle, on ? styles.circleOn : null]}>
              {uri ? <Image source={{ uri }} contentFit="cover" style={styles.circleImage} /> : <LayoutGrid size={26} color={colors.ink2} />}
            </View>
            <AppText weight={on ? 'bold' : 'regular'} size={fontSizes.body} color={on ? colors.ink : colors.ink2} numberOfLines={1}>
              {c.name}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const CIRCLE = 72;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  round: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
  content: { paddingBottom: 140, gap: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.input,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: fontSizes.listTitle, color: colors.ink, textAlign: 'right' },
  circles: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  circleItem: { alignItems: 'center', gap: spacing.sm, width: CIRCLE + 16 },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  circleOn: { borderColor: colors.black },
  circleImage: { width: CIRCLE - 20, height: CIRCLE - 20, borderRadius: radius.sm },
  section: { gap: spacing.sm },
  errorBox: { padding: spacing.lg, gap: spacing.md },
});
