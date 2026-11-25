import { type OrderLine, orderStatusLabel, type PartnerOrder } from '@tawsela/shared';
import { router } from 'expo-router';
import { Clock, Headset } from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { toast } from '@/components/Toast';
import { mediaUrl } from '@/core/api/client';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

const CAIRO = 'Africa/Cairo';

/** "منذ 1 دقيقة", "منذ 2 ساعة", then the date. */
export function useAgo() {
  const t = useT();
  return (iso: string) => {
    const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
    if (minutes < 60) return t('partner.ago', { count: minutes });
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? t('partner.agoHours', { count: hours }) : new Date(iso).toLocaleDateString('en-US', { timeZone: CAIRO });
  };
}

/** "الآن", or a later time today ("8:30 PM"). */
export function useWhen() {
  const t = useT();
  return (scheduledFor: string | null) =>
    scheduledFor ? new Date(scheduledFor).toLocaleTimeString('en-US', { timeZone: CAIRO, hour: 'numeric', minute: '2-digit' }) : t('partner.now');
}

/** The date in the details header, as on the photo ("11/23/2026"). */
export const orderDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: CAIRO });

/**
 * A card of الطلبات الجديده and طلباتى (partner/partner-home-new-orders-accept-reject-popup.png): the
 * dark-orange corner badge "#506898 - قيد المراجعة", "منذ 1 دقيقة" with a clock, an outlined
 * "احصل على مساعدة" with a headset and a light-orange "التفاصيل".
 */
export function PartnerOrderCard({ order }: { order: PartnerOrder }) {
  const t = useT();
  const locale = useLocale();
  const ago = useAgo();
  return (
    <View accessibilityLabel={t('orders.code', { code: order.code })} style={styles.card}>
      <View style={styles.badge}>
        <AppText weight="semibold" size={15} color={colors.bg}>
          {t('partner.cardTitle', { code: order.code, status: orderStatusLabel(order.status, locale) })}
        </AppText>
      </View>
      <View style={styles.ago}>
        <Clock size={18} color={colors.ink} />
        <AppText>{ago(order.createdAt)}</AppText>
      </View>
      <View style={styles.actions}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('partner.help')}
          // [Open] Support opens with its phase (15).
          onPress={() => toast.show(t('partner.helpSoon'))}
          style={styles.help}
        >
          <Headset size={22} color={colors.primary} />
          <AppText weight="semibold" size={15}>
            {t('partner.help')}
          </AppText>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('partner.details')}
          onPress={() => router.push(`/partner-order/${order.id}`)}
          style={styles.details}
        >
          <AppText weight="semibold" size={15} color={colors.primary700}>
            {t('partner.details')}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

/** A product's round photo, as in the popup. */
export function LineImage({ line }: { line: OrderLine }) {
  const uri = mediaUrl(line.image);
  return <View style={styles.photo}>{uri ? <Image source={{ uri }} style={styles.photoImage} accessibilityIgnoresInvertColors /> : null}</View>;
}

/** The chosen options and "بدون: بصل" under a line. */
export function LineChoices({ line }: { line: OrderLine }) {
  const t = useT();
  const parts = [...line.options, ...(line.removedIngredients.length ? [t('cart.without', { ingredients: line.removedIngredients.join('، ') })] : [])];
  return parts.length ? (
    <AppText size={fontSizes.caption} color={colors.ink2}>
      {parts.join(' · ')}
    </AppText>
  ) : null;
}

/** The status tabs of طلباتى, in the admin orders page's order (§9). */
export const STATUS_TABS = ['pending_review', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'rejected', 'cancelled'] as const;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary700,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomEndRadius: radius.lg,
  },
  ago: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  help: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
  },
  details: {
    backgroundColor: colors.primary50,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  photo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.input, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
});
