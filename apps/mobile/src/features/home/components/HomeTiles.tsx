import type { HomeTile } from '@tawsela/shared';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { Store } from 'lucide-react-native';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { mediaUrl } from '@/core/api/client';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

const PER_ROW = 4;
const GAP = spacing.md;

/** Where a tile goes: its vertical's store list (Phase 6) or its pinned store's page (Phase 7). */
const hrefOf = (tile: HomeTile): Href | null =>
  tile.targetStoreId !== null
    ? (`/store/${tile.targetStoreId}` as Href)
    : tile.targetVertical
      ? (`/stores/${tile.targetVertical}?title=${encodeURIComponent(tile.label)}` as Href)
      : null;

/** A tile's width: four across the screen, as in Tawsilty's first row. */
function useTileSize() {
  const { width } = useWindowDimensions();
  return Math.floor((width - spacing.lg * 2 - GAP * (PER_ROW - 1)) / PER_ROW);
}

function Tile({ tile, size }: { tile: HomeTile; size: number }) {
  const href = hrefOf(tile);
  const uri = mediaUrl(tile.image);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={tile.label}
      onPress={href ? () => router.push(href) : undefined}
      style={[styles.tile, { width: size }]}
    >
      <View style={[styles.card, { width: size, height: size }]}>
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} transition={150} />
        ) : (
          <Store size={size / 3} color={colors.primary} />
        )}
      </View>
      {tile.badge ? (
        <View style={styles.badge}>
          <AppText weight="medium" color={colors.bg} size={11} numberOfLines={1}>
            {tile.badge}
          </AppText>
        </View>
      ) : null}
      <AppText weight="medium" size={fontSizes.body} numberOfLines={2} style={styles.label}>
        {tile.label}
      </AppText>
    </PressableScale>
  );
}

/**
 * The home tiles (contract §8.2): a fixed first row, then a second row that scrolls sideways
 * and mixes verticals with pinned stores. Order and images come from the admin.
 */
export function HomeTiles({ tiles }: { tiles: HomeTile[] }) {
  const size = useTileSize();
  const fixed = tiles.filter((t) => t.row === 'fixed');
  const scroll = tiles.filter((t) => t.row === 'scroll');
  return (
    <View style={styles.rows}>
      {fixed.length ? (
        <View testID="tiles-fixed" style={styles.fixed}>
          {fixed.map((t) => (
            <Tile key={t.id} tile={t} size={size} />
          ))}
        </View>
      ) : null}
      {scroll.length ? (
        <ScrollView testID="tiles-scroll" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {scroll.map((t) => (
            <Tile key={t.id} tile={t} size={size} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

/** Loading: grey squares in the shape of the first row (contract §6.3). */
export function HomeTilesSkeleton() {
  const size = useTileSize();
  return (
    <View style={styles.fixed}>
      {Array.from({ length: PER_ROW }, (_, i) => (
        <View key={i} style={[styles.tile, { width: size }]}>
          <Skeleton style={{ width: size, height: size, borderRadius: radius.lg }} />
          <Skeleton style={{ width: size * 0.7, height: 12 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: spacing.xl },
  fixed: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: spacing.lg, rowGap: spacing.xl },
  scroll: { gap: GAP, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  tile: { alignItems: 'center', gap: spacing.sm },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    maxWidth: '92%',
    backgroundColor: colors.toastDark,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  label: { textAlign: 'center' },
});
