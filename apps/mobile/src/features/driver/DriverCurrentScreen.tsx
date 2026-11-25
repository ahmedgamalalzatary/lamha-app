import { type DriverOrder, formatMoney, orderStatusLabel } from '@tawsela/shared';
import { router } from 'expo-router';
import { Bike, MapPin, Store } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useDriverOrders } from './api';
import { cardShadow } from './parts';

/**
 * الطلبات الحالية (contract §10): the orders he took and has not delivered, oldest first. [Open]
 * Tawsilty's tab is not captured (§15.1 #9): the cards follow the store's order cards.
 */
export function DriverCurrentScreen() {
  const t = useT();
  const orders = useDriverOrders();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle} style={styles.title}>
        {t('tabs.currentOrders')}
      </AppText>
      {orders.isPending ? (
        <View style={styles.list}>
          {[0, 1].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : orders.isError ? (
        <View style={styles.center}>
          <AppText color={colors.danger}>{errorMessage(orders.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void orders.refetch()} />
        </View>
      ) : (
        <FlatList
          data={orders.data}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={[styles.list, orders.data.length === 0 && styles.grow]}
          refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} />}
          ListEmptyComponent={<EmptyState icon={Bike} title={t('driver.noCurrent')} message={t('driver.noCurrentBody')} />}
          renderItem={({ item }) => <CurrentCard order={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function CurrentCard({ order }: { order: DriverOrder }) {
  const t = useT();
  const locale = useLocale();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('driver.orderTitle', { code: order.code })}
      onPress={() => router.push(`/driver-order/${order.id}`)}
      scaleTo={0.98}
      style={styles.card}
    >
      <View style={styles.badge}>
        <AppText weight="semibold" size={15} color={colors.bg}>
          {t('partner.cardTitle', { code: order.code, status: orderStatusLabel(order.status, locale) })}
        </AppText>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Store size={18} color={colors.primary} />
          <AppText weight="semibold" style={styles.flex}>
            {order.store.name}
          </AppText>
          <AppText weight="bold">{formatMoney(order.total, locale)}</AppText>
        </View>
        <View style={styles.row}>
          <MapPin size={18} color={colors.primary} />
          <AppText color={colors.ink2}>{order.area ?? '—'}</AppText>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.lg },
  grow: { flexGrow: 1 },
  skeleton: { height: 110, borderRadius: radius.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  card: { backgroundColor: colors.bg, borderRadius: radius.md, overflow: 'hidden', ...cardShadow },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary700,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomEndRadius: radius.lg,
  },
  body: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
