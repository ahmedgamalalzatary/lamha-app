import { ReceiptText } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { usePartnerOrders } from './api';
import { useLiveConnected } from './live';
import { PartnerOrderCard } from './parts';

/**
 * الرئيسية = "الطلبات الجديده" (contract §9, partner/partner-home-new-orders-accept-reject-popup.png):
 * a centred title over a thin line, then a card per new order. [Open] The connection dot is ours.
 */
export function PartnerHomeScreen() {
  const t = useT();
  const orders = usePartnerOrders('pending_review');
  const connected = useLiveConnected();
  const label = t(connected ? 'partner.connected' : 'partner.disconnected');

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle + 2}>
          {t('partner.newOrders')}
        </AppText>
        <View accessible accessibilityLabel={label} style={[styles.dot, { backgroundColor: connected ? colors.success : colors.ink2 }]} />
      </View>
      {orders.isPending ? (
        <View style={styles.list}>
          {[0, 1].map((i) => (
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
          <EmptyState icon={ReceiptText} title={t('partner.noNewOrders')} />
        </View>
      ) : (
        <FlatList
          data={orders.data}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} />}
          renderItem={({ item }) => <PartnerOrderCard order={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.lg },
  skeleton: { height: 150, borderRadius: radius.md },
});
