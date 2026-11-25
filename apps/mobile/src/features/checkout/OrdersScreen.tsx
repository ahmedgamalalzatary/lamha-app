import { type CustomerOrder, formatMoney, orderStatusLabel } from '@tawsela/shared';
import { ReceiptText } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useMyOrders } from './api';

/**
 * طلباتي (contract §8.8, customer/orders/orders-empty-state.png): the title, then the orders, or "لا توجد
 * طلبات — ابدأ بطلب منتجاتك المفضلة الآن". [Open] The list's cards are not captured; Phase 14 adds the
 * order details, the delivered view and reordering.
 */
export function OrdersScreen() {
  const t = useT();
  const orders = useMyOrders();

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle} style={styles.title}>
        {t('tabs.orders')}
      </AppText>
      {orders.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : orders.isError ? (
        <View style={styles.center}>
          <AppText color={colors.danger}>{t('orders.loadFailed')}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void orders.refetch()} />
        </View>
      ) : orders.data.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon={ReceiptText} title={t('orders.empty')} message={t('orders.emptyMessage')} />
        </View>
      ) : (
        <FlatList
          data={orders.data}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} />}
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const t = useT();
  const locale = useLocale();
  return (
    <View accessibilityLabel={t('orders.code', { code: order.code })} style={styles.card}>
      <View style={styles.row}>
        <AppText weight="bold" style={styles.grow}>
          {t('orders.code', { code: order.code })}
        </AppText>
        <View style={styles.status}>
          <AppText size={fontSizes.body} weight="semibold" color={colors.primary700}>
            {orderStatusLabel(order.status, locale)}
          </AppText>
        </View>
      </View>
      <AppText color={colors.ink2}>{order.store.name}</AppText>
      <View style={styles.row}>
        <AppText color={colors.ink2} style={styles.grow}>
          {t('orders.items', { count: order.count })}
        </AppText>
        <AppText weight="bold">{formatMoney(order.total, locale)}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  grow: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.md },
  skeleton: { height: 96, borderRadius: radius.lg },
  card: { gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  status: { backgroundColor: colors.primary50, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
