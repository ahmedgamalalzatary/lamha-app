import type { CatalogStore, HomeSection } from '@tawsela/shared';
import { type Href, router } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Photo } from '@/components/Photo';
import { PressableScale } from '@/components/PressableScale';
import { Rating } from '@/components/Rating';
import { mediaUrl } from '@/core/api/client';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, shadows, spacing } from '@/core/theme';
import { closedLook, GREYSCALE } from '@/features/stores/components/closed-look';

const PER_COLUMN = 3;

/** A compact white store card (lamha's MiniStoreCard): picture, name, rating and minutes; "مغلق" over a closed store. */
export function MiniStoreCard({ store, width }: { store: CatalogStore; width: number }) {
  const t = useT();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={store.name} onPress={() => router.push(`/store/${store.id}` as Href)} style={[styles.card, { width }]}>
      <View style={styles.picture}>
        <Photo uri={mediaUrl(store.cover ?? store.logo)} grey={!store.isOpen && GREYSCALE} style={StyleSheet.absoluteFill} />
        {!store.isOpen ? (
          <View style={[StyleSheet.absoluteFill, styles.closed, closedLook.shade]}>
            <View style={styles.closedPill}>
              <AppText weight="semibold" size={fontSizes.caption - 0.5} color={colors.sheet}>
                {t('stores.closed')}
              </AppText>
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.text}>
        <AppText weight="bold" size={15} numberOfLines={1}>
          {store.name}
        </AppText>
        <View style={styles.meta}>
          {store.rating === null ? (
            <AppText weight="medium" size={fontSizes.caption}>
              {t('stores.new')}
            </AppText>
          ) : (
            <Rating value={store.rating} count={store.ratingCount} />
          )}
          <View style={styles.bar} />
          <Clock size={14} color={colors.ink3} />
          <AppText size={fontSizes.caption} color={colors.ink2}>
            {t('stores.minutesShort', { n: store.deliveryMinutes })}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

/** One coloured band: its title and round picture, then its stores three to a column, scrolling sideways. */
function Band({ section }: { section: HomeSection }) {
  const { width } = useWindowDimensions();
  const column = Math.round(width * 0.84);
  const columns: CatalogStore[][] = [];
  for (let i = 0; i < section.stores.length; i += PER_COLUMN) columns.push(section.stores.slice(i, i + PER_COLUMN));
  return (
    <View testID="home-section" style={[styles.band, { backgroundColor: section.background }]}>
      <View style={styles.head}>
        <AppText accessibilityRole="header" weight="bold" size={19} color={section.ink} style={styles.title}>
          {section.title}
        </AppText>
        {section.image ? <Photo uri={mediaUrl(section.image)} style={styles.round} /> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.columns}>
        {columns.map((col, i) => (
          <View key={i} style={styles.column}>
            {col.map((s) => (
              <MiniStoreCard key={s.id} store={s} width={column} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** The coloured store sections the admin sets (L1 #2, "الأكثر طلباً 🔥"), in order. */
export function HomeSections({ sections }: { sections: HomeSection[] }) {
  return (
    <>
      {sections.map((s) => (
        <Band key={s.id} section={s} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  band: { paddingVertical: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  title: { flex: 1 },
  round: { width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: colors.glassRing },
  columns: { gap: 10, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  column: { gap: 10 },
  card: { height: 84, flexDirection: 'row', alignItems: 'center', gap: spacing.md, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.sheet, paddingEnd: spacing.md, ...shadows.sheet },
  picture: { width: 96, height: '100%' },
  closed: { alignItems: 'center', justifyContent: 'center' },
  closedPill: { borderRadius: radius.pill, backgroundColor: colors.pillDark, paddingHorizontal: 10, paddingVertical: 2 },
  text: { flex: 1, minWidth: 0, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: { width: 1, height: 12, backgroundColor: colors.line },
});
