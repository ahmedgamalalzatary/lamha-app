import { type CatalogStore, formatAmount, formatClock, formatMinutes } from '@tawsela/shared';
import { Image } from 'expo-image';
import { Bike, Clock, Star, Store as StoreIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { mediaUrl } from '@/core/api/client';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { closedLook, GREYSCALE } from '@/features/stores/components/closed-look';
import { FreeFee } from '@/features/stores/components/FreeFee';

export const COVER_HEIGHT = 300;

/**
 * The top of a store page (contract §8.4): the cover with the "مغلق" pill, the logo, name and rating,
 * then the info row مدة التوصيل · رسوم التوصيل · التوصيل بواسطة.
 * Closed (customer/store/store-page-closed-greyscale-opens-at.png): the cover in greyscale, "مغلق" on the
 * logo, and "يفتح الساعة 11:00 ص" when its hours closed it.
 */
export function StoreHeader({ store }: { store: CatalogStore }) {
  const locale = useLocale();
  const t = useT();
  const cover = mediaUrl(store.cover);
  const logo = mediaUrl(store.logo);
  return (
    <View>
      <View style={styles.cover}>
        {cover ? (
          <View style={[StyleSheet.absoluteFill, !store.isOpen && GREYSCALE ? closedLook.greyscale : null]}>
            <Image source={{ uri: cover }} contentFit="cover" style={StyleSheet.absoluteFill} />
          </View>
        ) : null}
        <View style={[StyleSheet.absoluteFill, store.isOpen || GREYSCALE ? styles.shade : closedLook.shade]} />
        {store.opensAt ? (
          <View style={styles.closedPill}>
            <Clock size={16} color={colors.bg} />
            <AppText weight="semibold" color={colors.bg}>
              {t('store.opensAt', { time: formatClock(store.opensAt, locale) })}
            </AppText>
          </View>
        ) : null}
        <View style={styles.identity}>
          <View style={styles.logo}>
            {logo ? <Image source={{ uri: logo }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <StoreIcon size={32} color={colors.primary} />}
            {store.isOpen ? null : (
              <View style={[StyleSheet.absoluteFill, closedLook.shade, styles.logoClosed]}>
                <AppText weight="semibold" color={colors.bg}>
                  {t('stores.closed')}
                </AppText>
              </View>
            )}
          </View>
          <View style={styles.names}>
            <AppText accessibilityRole="header" weight="bold" size={22} color={colors.bg} numberOfLines={2}>
              {store.name}
            </AppText>
            <View style={styles.rating}>
              <Star size={15} color={colors.star} fill={colors.star} />
              <AppText weight="semibold" color={colors.bg}>
                {store.rating === null ? t('stores.new') : `${store.rating.toFixed(2)} (${store.ratingCount})`}
              </AppText>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.info}>
        <Info icon={Clock} label={t('store.deliveryTime')} value={formatMinutes(store.deliveryMinutes, locale)} color={colors.info} />
        <View style={styles.divider} />
        <Info
          icon={Bike}
          label={t('store.deliveryFee')}
          value={
            store.deliveryFee === 0 ? (
              <FreeFee size={16} />
            ) : store.offers.freeDeliveryFrom === 0 ? (
              <View style={styles.freeRow}>
                <AppText color={colors.danger} style={styles.struck} accessibilityLabel={t('stores.usualFee', { amount: formatAmount(store.deliveryFee, locale) })}>
                  {formatAmount(store.deliveryFee, locale)}
                </AppText>
                <FreeFee size={16} />
              </View>
            ) : (
              formatAmount(store.deliveryFee, locale)
            )
          }
        />
        <View style={styles.divider} />
        <Info icon={StoreIcon} label={t('store.deliveredBy')} value={t(`store.deliveredBy.${store.deliveredBy}`)} color={colors.info} />
      </View>
    </View>
  );
}

function Info({ icon: Icon, label, value, color = colors.ink }: { icon: LucideIcon; label: string; value: ReactNode; color?: string }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoLabel}>
        <Icon size={15} color={colors.ink2} />
        <AppText color={colors.ink2} size={fontSizes.caption}>
          {label}
        </AppText>
      </View>
      {typeof value === 'string' ? (
        <AppText weight="bold" color={color}>
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: COVER_HEIGHT, backgroundColor: colors.ink, justifyContent: 'flex-end' },
  shade: { backgroundColor: colors.coverShade },
  closedPill: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.pillDark,
  },
  logoClosed: { alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl + spacing.lg },
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.bg,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  names: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  info: {
    flexDirection: 'row',
    marginTop: -spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  infoItem: { flex: 1, alignItems: 'center', gap: spacing.sm },
  infoLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  struck: { textDecorationLine: 'line-through' },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.line },
});
