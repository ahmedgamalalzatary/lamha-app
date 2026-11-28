import type { CustomerOrder, OrderStatus } from '@tawsela/shared';
import { type Href, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Receipt } from '@/components/Receipt';
import { Stamp } from '@/components/Stamp';
import { StoreLogo } from '@/components/StoreLogo';
import { mediaUrl } from '@/core/api/client';
import { type TranslationKey, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useMyOrders } from '@/features/checkout/api/checkout';

/** The statuses of an order still on its way, in order: the bar fills one step at a time. */
export const LIVE_STEPS = ['pending_review', 'preparing', 'ready', 'out_for_delivery'] as const satisfies readonly OrderStatus[];
type LiveStatus = (typeof LIVE_STEPS)[number];

const isLive = (s: OrderStatus): s is LiveStatus => (LIVE_STEPS as readonly OrderStatus[]).includes(s);

/** The newest order still on its way, if any (the list comes newest first). */
export const liveOrder = (orders: CustomerOrder[] | undefined): CustomerOrder | undefined => orders?.find((o) => isLive(o.status));

/** How far along it is, 0–1: a quarter for each step reached. */
export const liveProgress = (status: OrderStatus): number => (isLive(status) ? (LIVE_STEPS.indexOf(status) + 1) / LIVE_STEPS.length : 1);

function words(o: CustomerOrder): { title: TranslationKey; stamp: TranslationKey } {
  const status = o.status as LiveStatus;
  if (status === 'ready' && o.mode === 'pickup') return { title: 'live.title.readyPickup', stamp: 'live.stamp.ready' };
  return { title: `live.title.${status}`, stamp: `live.stamp.${status}` };
}

/**
 * The order on its way, pinned on home (L1 #3, lamha's receipt stub): the store, "طلب #506898", where it
 * is now with its stamp, and a bar that fills as it moves. Tapping it opens the order.
 */
export function LiveOrderStrip() {
  const t = useT();
  const orders = useMyOrders();
  const order = liveOrder(orders.data);
  if (!order) return null;
  const { title, stamp } = words(order);
  const progress = liveProgress(order.status);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('live.order', { code: order.code, store: order.store.name })}، ${t(title)}`}
      onPress={() => router.push(`/order/${order.id}` as Href)}
      scaleTo={0.98}
      style={styles.wrap}
    >
      <Receipt style={styles.body}>
        <View style={styles.row}>
          <StoreLogo name={order.store.name} logo={mediaUrl(order.store.logo)} size={40} />
          <View style={styles.text}>
            <AppText size={fontSizes.caption} color={colors.ink3} numberOfLines={1}>
              {t('live.order', { code: order.code, store: order.store.name })}
            </AppText>
            <AppText weight="semibold" size={15} numberOfLines={1}>
              {t(title)}
            </AppText>
          </View>
          <Stamp key={order.status} label={t(stamp)} tone={order.status === 'pending_review' ? 'primary' : 'success'} size="sm" animate />
        </View>
        <View style={styles.footer}>
          <AppText weight="medium" size={13} color={colors.primary}>
            {t('live.track')}
          </AppText>
          <DirectionalIcon icon={ChevronLeft} size={16} color={colors.primary} />
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={t('live.progress')}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${Math.max(3, progress * 100)}%` }]} />
        </View>
      </Receipt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg },
  body: { paddingTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, minWidth: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.md },
  track: { height: 6, marginTop: spacing.md, borderRadius: radius.pill, backgroundColor: colors.primary50, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
});
