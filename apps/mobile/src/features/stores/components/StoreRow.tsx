import type { CatalogStore } from '@tawsela/shared';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { Store } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { mediaUrl } from '@/core/api/client';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { OfferBadges } from '@/features/offers/OfferBadges';
import { closedLook, GREYSCALE } from './closed-look';
import { StoreMeta } from './StoreMeta';

const SIZE = 96;

/** A store's square picture: its cover with the logo in the corner; greyscale with "مغلق" while closed (§6.3). */
export function StorePicture({ store, size = SIZE }: { store: CatalogStore; size?: number }) {
  const t = useT();
  const cover = mediaUrl(store.cover ?? store.logo);
  const logo = store.cover ? mediaUrl(store.logo) : null;
  return (
    <View style={[styles.picture, { width: size, height: size }]}>
      <View style={[styles.images, !store.isOpen && GREYSCALE ? closedLook.greyscale : null]}>
        {cover ? <Image source={{ uri: cover }} contentFit="cover" style={StyleSheet.absoluteFill} transition={150} /> : <Store size={size / 3} color={colors.primary} />}
        {logo ? <Image source={{ uri: logo }} contentFit="cover" style={styles.logo} /> : null}
      </View>
      {store.isOpen ? null : (
        <View style={[styles.closed, GREYSCALE ? null : closedLook.shade]}>
          <View style={GREYSCALE ? styles.closedPill : null}>
            <AppText weight="medium" color={colors.bg}>
              {t('stores.closed')}
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
}

/** A store in a list (contract §8.3): picture, name, rating or "جديد", time, fee, its offers (§8.10). Opens the store. */
export function StoreRow({ store }: { store: CatalogStore }) {
  return (
    <PressableScale
      accessibilityRole="button"
      testID="store-row"
      accessibilityLabel={store.name}
      onPress={() => router.push(`/store/${store.id}` as Href)}
      style={styles.row}
    >
      <StorePicture store={store} />
      <View style={styles.text}>
        <AppText weight="bold" size={fontSizes.listTitle} numberOfLines={1}>
          {store.name}
        </AppText>
        <StoreMeta store={store} />
        <OfferBadges offers={store.offers} />
      </View>
    </PressableScale>
  );
}

export function StoreRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton style={{ width: SIZE, height: SIZE, borderRadius: radius.md }} />
      <View style={styles.text}>
        <Skeleton style={{ width: '60%', height: 16 }} />
        <Skeleton style={{ width: '80%', height: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  picture: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { position: 'absolute', top: 6, end: 6, width: 36, height: 36, borderRadius: radius.sm },
  images: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  closed: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  closedPill: { backgroundColor: colors.closedShade, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  text: { flex: 1, gap: spacing.sm, alignItems: 'flex-start' },
});
