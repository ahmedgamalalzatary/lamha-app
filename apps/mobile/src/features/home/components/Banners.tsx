import type { HomeBanner } from '@tawsela/shared';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { mediaUrl } from '@/core/api/client';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { ProductCard } from '@/features/store/components/ProductItems';
import { ProductSheet } from '@/features/store/components/ProductSheet';
import { useProductTaps } from '@/features/store/hooks/useProductTaps';

/** Slides change by themselves this often. */
const SLIDE_MS = 4000;
const RAIL_CARD = 140;

/** Where a banner goes: its store page, or the store's products as one grid (the mart banner). */
const open = (b: HomeBanner) => router.push((b.opens === 'products' ? `/store/${b.store.id}/products` : `/store/${b.store.id}`) as Href);

function BannerImage({ banner, height }: { banner: HomeBanner; height: number }) {
  const uri = mediaUrl(banner.image);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={banner.store.name} onPress={() => open(banner)} scaleTo={0.98} style={[styles.image, { height }]}>
      {uri ? <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} transition={150} /> : null}
    </PressableScale>
  );
}

/**
 * "العروض اللي تستاهل تجربها دلوووقتي ⚡" (customer/home/home-points-wallet-shortcuts-offers-carousel-new-section):
 * the admin's banners sliding by themselves, with dots; each opens its store (§8.2).
 */
export function BannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const t = useT();
  const { width } = useWindowDimensions();
  const slide = width - spacing.lg * 2;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % banners.length;
        scroll.current?.scrollTo({ x: next * (slide + spacing.md), animated: true });
        return next;
      });
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [banners.length, slide]);

  if (!banners.length) return null;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (slide + spacing.md)));

  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle} style={styles.title}>
        {t('home.banners')}
      </AppText>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={slide + spacing.md}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={styles.row}
      >
        {banners.map((b) => (
          <View key={b.id} style={{ width: slide }}>
            <BannerImage banner={b} height={slide * 0.62} />
          </View>
        ))}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A rail (§8.2 "a banner that opens the mart directly, with a row of its products"): the banner opens
 * the store's products as one grid; its products sit under it with their "+" buttons.
 */
export function BannerRail({ banner }: { banner: HomeBanner }) {
  const { width } = useWindowDimensions();
  const { actions, cart, sheet, setSheet } = useProductTaps(banner.store.id);
  return (
    <View testID="banner-rail" style={styles.section}>
      <View style={styles.title}>
        <BannerImage banner={banner} height={(width - spacing.lg * 2) * 0.4} />
      </View>
      {banner.products.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {banner.products.map((p) => (
            <ProductCard key={p.id} product={p} actions={actions} width={RAIL_CARD} />
          ))}
        </ScrollView>
      ) : null}
      <ProductSheet product={sheet} menu={banner.products} countOf={cart.countOf} onAdd={cart.add} onOpen={setSheet} onClose={() => setSheet(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: { paddingHorizontal: spacing.lg },
  row: { gap: spacing.md, paddingHorizontal: spacing.lg },
  image: { width: '100%', borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { width: 22, backgroundColor: colors.primary },
});
