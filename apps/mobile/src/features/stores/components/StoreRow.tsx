import type { CatalogStore } from '@tawsela/shared';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { formatClock } from '@tawsela/shared';
import { Heart, Store } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { toast } from '@/components/Toast';
import { useFavorites, useToggleFavorite } from '@/features/store/api/store';
import { colors, fontSizes, radius, shadows, spacing } from '@/core/theme';
import { OfferBadges } from '@/features/offers/components/OfferBadges';
import { closedLook, GREYSCALE } from './closed-look';
import { StoreMeta } from './StoreMeta';

const SIZE = 92;

/** A store's square picture: its cover with the logo in the corner; greyscale with "مغلق" while closed (§6.3). */
export function StorePicture({ store, size = SIZE }: { store: CatalogStore; size?: number }) {
  const t = useT();
  const cover = mediaUrl(store.cover ?? store.logo);
  const logo = store.cover ? mediaUrl(store.logo) : null;
  return (
    <View style={[styles.picture, { width: size, height: size }]}>
      <View style={[styles.images, !store.isOpen && GREYSCALE ? closedLook.greyscale : null]}>
        {cover ? <Image source={{ uri: cover }} contentFit="cover" style={StyleSheet.absoluteFill} transition={150} /> : <Store size={size / 3} color={colors.primary} />}
      </View>
      {logo ? <Image source={{ uri: logo }} contentFit="cover" style={styles.logo} /> : null}
      {store.isOpen ? null : (
        <View style={[styles.closed, GREYSCALE ? null : closedLook.shade]}>
          <View style={GREYSCALE ? styles.closedPill : null}>
            <AppText weight="semibold" size={fontSizes.caption} color={colors.sheet}>
              {t('stores.closed')}
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
}

/** The heart on a store row: adds the store to المفضلة or takes it out. */
function FavoriteHeart({ store }: { store: CatalogStore }) {
  const t = useT();
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const on = favorites.data?.some((s) => s.id === store.id) ?? false;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t(on ? 'stores.removeFavorite' : 'stores.addFavorite', { name: store.name })}
      accessibilityState={{ selected: on, busy: toggle.isPending }}
      disabled={toggle.isPending || favorites.isPending}
      onPress={() => toggle.mutate({ storeId: store.id, on: !on }, { onError: (e) => toast.show(errorMessage(e), 'error') })}
      hitSlop={6}
      scaleTo={0.85}
      style={styles.heart}
    >
      <Heart size={20} color={on ? colors.danger : colors.ink3} fill={on ? colors.danger : 'transparent'} />
    </PressableScale>
  );
}

/**
 * A store in a list (lamha's card, contract §8.3): picture with the logo in its corner, name, rating or
 * "جديد", time, fee, then its offers (§8.10) or, while closed, when it opens. The heart sits on the far
 * corner. Opens the store.
 */
export function StoreRow({ store, heart = true }: { store: CatalogStore; heart?: boolean }) {
  const t = useT();
  const locale = useLocale();
  return (
    <View style={styles.wrap}>
      <PressableScale
        accessibilityRole="button"
        testID="store-row"
        accessibilityLabel={store.name}
        onPress={() => router.push(`/store/${store.id}` as Href)}
        style={styles.row}
      >
        <StorePicture store={store} />
        <View style={[styles.text, heart && styles.textWithHeart]}>
          <AppText weight="semibold" size={fontSizes.listTitle} numberOfLines={1}>
            {store.name}
          </AppText>
          <StoreMeta store={store} />
          {!store.isOpen ? (
            <AppText weight="medium" size={fontSizes.caption} color={colors.danger}>
              {store.opensAt ? t('stores.closedUntil', { time: formatClock(store.opensAt, locale) }) : t('stores.closedNow')}
            </AppText>
          ) : (
            <OfferBadges offers={store.offers} />
          )}
        </View>
      </PressableScale>
      {heart ? <FavoriteHeart store={store} /> : null}
    </View>
  );
}

export function StoreRowSkeleton() {
  return (
    <View style={[styles.row, styles.wrap]}>
      <Skeleton style={{ width: SIZE, height: SIZE, borderRadius: radius.card }} />
      <View style={styles.text}>
        <Skeleton style={{ width: '60%', height: 16 }} />
        <Skeleton style={{ width: '80%', height: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md, borderRadius: 18, backgroundColor: colors.sheet, padding: 10, ...shadows.sheet },
  picture: { alignItems: 'center', justifyContent: 'center' },
  logo: { position: 'absolute', bottom: -6, start: -6, width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: colors.sheet },
  images: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.primary50 },
  heart: { position: 'absolute', top: spacing.sm, end: spacing.sm, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  textWithHeart: { paddingEnd: 28 },
  closed: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', borderRadius: radius.card, overflow: 'hidden' },
  closedPill: { backgroundColor: colors.closedShade, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  text: { flex: 1, gap: 6, alignItems: 'flex-start', paddingVertical: 2 },
});
