import { type OrderStatus, orderStatusLabel } from '@tawsela/shared';
import { ReceiptText } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { usePartnerOrders } from '../api/partner';
import { PartnerOrderCard, STATUS_TABS } from '../components/parts';

/**
 * طلباتى (contract §9): the store's orders by status with the same cards. [Open] Tawsilty's screen is
 * not captured; the tabs follow the admin orders page.
 */
export function PartnerOrdersScreen() {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState<OrderStatus>('pending_review');
  const orders = usePartnerOrders(status);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle} style={styles.title}>
        {t('tabs.partnerOrders')}
      </AppText>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {STATUS_TABS.map((s) => {
            const on = s === status;
            return (
              <PressableScale
                key={s}
                accessibilityRole="button"
                accessibilityLabel={orderStatusLabel(s, locale)}
                accessibilityState={{ selected: on }}
                onPress={() => setStatus(s)}
                style={[styles.tab, on && styles.tabOn]}
              >
                <AppText weight="semibold" color={on ? colors.bg : colors.ink2}>
                  {orderStatusLabel(s, locale)}
                </AppText>
              </PressableScale>
            );
          })}
        </ScrollView>
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
          <EmptyState icon={ReceiptText} title={t('orders.empty')} />
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
  title: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  tabs: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.input },
  tabOn: { backgroundColor: colors.primary },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.lg },
  skeleton: { height: 150, borderRadius: radius.md },
});
