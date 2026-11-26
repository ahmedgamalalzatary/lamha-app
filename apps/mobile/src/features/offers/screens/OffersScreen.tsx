import { OFFER_KINDS, type OfferKind, SEARCH_SCOPES, type SearchScope } from '@tawsela/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Bike, ChevronRight, type LucideIcon, SearchX, Tag, Ticket } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { StoreRow, StoreRowSkeleton } from '@/features/stores/components/StoreRow';
import { useOfferStores } from '../api/offers';

const ICONS: Record<OfferKind, LucideIcon> = { discounts: Tag, coupons: Ticket, delivery: Bike };
const SCOPE_LABEL = { all: 'search.all', restaurants: 'search.restaurants', others: 'search.others' } as const;

/**
 * The offers screen (contract §8.10, offers-screen-*): an orange header whose title and line follow
 * the tab, the pill tabs خصومات · كوبونات · عروض التوصيل, the sub-tabs الكل · مطاعم · متاجر أخرى,
 * and the stores with that kind of offer, each with its badges.
 */
export function OffersScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<OfferKind>(OFFER_KINDS.includes(params.kind as OfferKind) ? (params.kind as OfferKind) : 'discounts');
  const [scope, setScope] = useState<SearchScope>('all');
  const stores = useOfferStores(kind, scope);
  const Icon = ICONS[kind];

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.headerFrom, colors.headerTo]} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Icon size={120} color={colors.glass} style={styles.art} />
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
          <DirectionalIcon icon={ChevronRight} size={24} color={colors.ink} />
        </PressableScale>
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle + 4} color={colors.bg}>
          {t(`offers.title.${kind}`)}
        </AppText>
        <AppText color={colors.bg}>{t(`offers.subtitle.${kind}`)}</AppText>
      </LinearGradient>

      <View accessibilityRole="tablist" style={styles.pills}>
        {OFFER_KINDS.map((k) => {
          const on = k === kind;
          const PillIcon = ICONS[k];
          return (
            <PressableScale
              key={k}
              accessibilityRole="tab"
              accessibilityLabel={t(`offers.tab.${k}`)}
              accessibilityState={{ selected: on }}
              onPress={() => setKind(k)}
              style={[styles.pill, on && styles.pillOn]}
            >
              <PillIcon size={16} color={on ? colors.bg : colors.primary} />
              <AppText weight="bold" size={fontSizes.body} color={on ? colors.bg : colors.ink}>
                {t(`offers.tab.${k}`)}
              </AppText>
            </PressableScale>
          );
        })}
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {SEARCH_SCOPES.map((s) => {
          const on = s === scope;
          return (
            <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setScope(s)} style={styles.tab}>
              <AppText weight={on ? 'bold' : 'regular'} color={on ? colors.ink : colors.ink2} size={fontSizes.listTitle}>
                {t(SCOPE_LABEL[s])}
              </AppText>
              <View style={[styles.tabLine, on && styles.tabLineOn]} />
            </Pressable>
          );
        })}
      </View>

      {stores.isError ? (
        <View style={styles.errorBox}>
          <AppText color={colors.danger}>{errorMessage(stores.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void stores.refetch()} />
        </View>
      ) : !stores.data ? (
        <View>
          {[0, 1, 2].map((i) => (
            <StoreRowSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={stores.data}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => <StoreRow store={item} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          ListEmptyComponent={<EmptyState icon={SearchX} title={t('stores.emptyTitle')} message={t('stores.emptyText')} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs, overflow: 'hidden' },
  art: { position: 'absolute', start: -spacing.lg, bottom: -spacing.lg, transform: [{ rotate: '-20deg' }] },
  back: { alignSelf: 'flex-end', width: sizes.touch, height: sizes.touch, borderRadius: sizes.touch / 2, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  pills: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flex: 1, alignItems: 'center', paddingTop: spacing.md, gap: spacing.md },
  tabLine: { height: 3, width: 64, borderRadius: 2, backgroundColor: 'transparent' },
  tabLineOn: { backgroundColor: colors.primary },
  errorBox: { padding: spacing.lg, gap: spacing.md },
});
