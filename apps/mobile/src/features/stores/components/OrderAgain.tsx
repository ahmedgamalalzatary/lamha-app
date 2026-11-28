import type { CatalogStore, CustomerOrder } from '@tawsela/shared';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';
import { useMyOrders } from '@/features/checkout/api/checkout';
import { MiniStoreCard } from '@/features/home/components/HomeSections';

const MAX = 4;

/** The stores of this list the customer got orders from, most recent first, at most four. */
export function orderAgainStores(orders: CustomerOrder[] | undefined, stores: CatalogStore[]): CatalogStore[] {
  const byId = new Map(stores.map((s) => [s.id, s]));
  const seen = new Set<number>();
  const out: CatalogStore[] = [];
  for (const o of orders ?? []) {
    if (o.status !== 'delivered' || seen.has(o.store.id)) continue;
    seen.add(o.store.id);
    const store = byId.get(o.store.id);
    if (store) out.push(store);
    if (out.length === MAX) break;
  }
  return out;
}

/** "اطلب من جديد" (contract §8.3, lamha's cream band): stores of this list the customer ordered from before. */
export function OrderAgain({ stores, width }: { stores: CatalogStore[]; width: number }) {
  const t = useT();
  const orders = useMyOrders();
  const again = orderAgainStores(orders.data, stores);
  if (!again.length) return null;
  return (
    <View style={styles.band}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>
        {t('stores.orderAgain')}
      </AppText>
      {again.map((s) => (
        <MiniStoreCard key={s.id} store={s} width={width} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.desk, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: 10 },
});
