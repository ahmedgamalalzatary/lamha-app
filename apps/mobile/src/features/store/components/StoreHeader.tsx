import { type CatalogStore, formatAmount, formatMinutes } from '@tawsela/shared';
import { Image } from 'expo-image';
import { Bike, Clock, Star, Store as StoreIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { mediaUrl } from '@/core/api/client';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { FreeFee } from '@/features/stores/components/FreeFee';

export const COVER_HEIGHT = 300;
const STAR = '#F5A623';

/**
 * The top of a store page (contract §8.4): the cover with the "مغلق" pill, the logo, name and rating,
 * then the info row مدة التوصيل · رسوم التوصيل · التوصيل بواسطة.
 * [Open] A closed store's cover is darkened, not turned grey (no greyscale filter in the app).
 */
export function StoreHeader({ store }: { store: CatalogStore }) {
  const t = useT();
  const cover = mediaUrl(store.cover);
  const logo = mediaUrl(store.logo);
  return (
    <View>
      <View style={styles.cover}>
        {cover ? <Image source={{ uri: cover }} contentFit="cover" style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, store.isOpen ? styles.shade : styles.closedShade]} />
        {store.isOpen ? null : (
          <View style={styles.closedPill}>
            <Clock size={16} color={colors.bg} />
            <AppText weight="semibold" color={colors.bg}>
              {t('stores.closed')}
            </AppText>
          </View>
        )}
        <View style={styles.identity}>
          <View style={styles.logo}>{logo ? <Image source={{ uri: logo }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <StoreIcon size={32} color={colors.primary} />}</View>
          <View style={styles.names}>
            <AppText accessibilityRole="header" weight="bold" size={22} color={colors.bg} numberOfLines={2}>
              {store.name}
            </AppText>
            <View style={styles.rating}>
              <Star size={15} color={STAR} fill={STAR} />
              <AppText weight="semibold" color={colors.bg}>
                {store.rating === null ? t('stores.new') : `${store.rating.toFixed(2)} (${store.ratingCount})`}
              </AppText>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.info}>
        <Info icon={Clock} label={t('store.deliveryTime')} value={formatMinutes(store.deliveryMinutes)} color={colors.info} />
        <View style={styles.divider} />
        <Info icon={Bike} label={t('store.deliveryFee')} value={store.deliveryFee === 0 ? <FreeFee size={16} /> : formatAmount(store.deliveryFee)} />
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
  shade: { backgroundColor: 'rgba(0,0,0,0.25)' },
  closedShade: { backgroundColor: 'rgba(40,40,40,0.6)' },
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
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
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
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.line },
});
