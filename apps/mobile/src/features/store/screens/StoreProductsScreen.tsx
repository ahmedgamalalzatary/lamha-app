import { productSaving } from '@tawsela/shared';
import { useLocalSearchParams } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { useStorePage } from '../api/store';
import { CartBar } from '../components/CartBar';
import { ProductGrid } from '../components/ProductItems';
import { ProductSheet } from '../components/ProductSheet';
import { useProductTaps } from '../hooks/useProductTaps';

/**
 * A store's products as one grid, two to a row, under its name (contract §8.2,
 * mart-banner-opens-products-grid): opened by a home rail banner. With `offers=1`, only the
 * discounted ones ("عرض الكل" on "العروض", "عرض المنتجات" on the discount card).
 */
export function StoreProductsScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ id: string; offers?: string }>();
  const storeId = Number(params.id);
  const page = useStorePage(storeId);
  const { cart, actions, sheet, setSheet } = useProductTaps(storeId);
  const store = page.data;
  const menu = store?.categories.flatMap((c) => c.products) ?? [];
  const shown = menu.filter((p) => p.active && (params.offers !== '1' || productSaving(p) > 0));

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.bar}>
        <BackButton variant="round" />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle} numberOfLines={1} style={styles.title}>
          {params.offers === '1' ? t('offers.deals') : (store?.name ?? '')}
        </AppText>
      </View>
      {!store ? (
        <View style={styles.errorBox}>
          {page.isError ? (
            <>
              <AppText color={colors.danger}>{errorMessage(page.error)}</AppText>
              <Button label={t('common.retry')} variant="soft" onPress={() => void page.refetch()} />
            </>
          ) : (
            [0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 160, borderRadius: radius.lg }} />)
          )}
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {shown.length ? <ProductGrid products={shown} actions={actions} columns={2} /> : <EmptyState icon={SearchX} title={t('store.empty')} />}
          </ScrollView>
          <CartBar storeId={storeId} count={cart.count} total={cart.total} minimumOrder={store.minimumOrder} />
          <ProductSheet product={sheet} menu={menu} countOf={cart.countOf} onAdd={cart.add} onOpen={setSheet} onClose={() => setSheet(null)} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  round: { width: sizes.touch, height: sizes.touch, borderRadius: sizes.touch / 2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
  content: { paddingTop: spacing.md, paddingBottom: 140 },
  errorBox: { padding: spacing.lg, gap: spacing.md },
});
