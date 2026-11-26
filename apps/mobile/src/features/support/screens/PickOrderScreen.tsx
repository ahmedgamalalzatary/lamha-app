import { customerStatusLabel, formatMoney } from '@tawsela/shared';
import { router } from 'expo-router';
import { ReceiptText } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useMyOrders } from '@/features/checkout/api/checkout';
import { orderDate } from '@/features/partner/components/parts';

/**
 * تقديم شكوى › طلب سابق (contract §8.14): pick the order from طلباتي, then the complaint form about it
 * [Open: the picker is not captured; the طلباتي cards].
 */
export function PickOrderScreen() {
  const t = useT();
  const locale = useLocale();
  const orders = useMyOrders();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton variant="plain" />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle}>
          {t('support.pickOrder')}
        </AppText>
      </View>
      {orders.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : orders.isError ? (
        <View style={styles.list}>
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
          renderItem={({ item: o }) => (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('orders.code', { code: o.code })}
              onPress={() => router.replace({ pathname: '/support/[type]', params: { type: 'complaint', orderId: String(o.id), code: o.code } })}
              style={styles.card}
            >
              <View style={styles.row}>
                <AppText weight="bold" style={styles.grow}>
                  {t('orders.code', { code: o.code })}
                </AppText>
                <AppText color={colors.ink2}>{orderDate(o.createdAt)}</AppText>
              </View>
              <AppText color={colors.ink2}>
                {o.store.name} · {customerStatusLabel(o.status, o.mode, locale)}
              </AppText>
              <AppText weight="bold">{formatMoney(o.total, locale)}</AppText>
            </PressableScale>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  skeleton: { height: 96, borderRadius: radius.lg },
  card: { gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
});
