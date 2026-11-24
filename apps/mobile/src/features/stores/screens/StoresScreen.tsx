import { RATING_FLOORS, SEARCH_MAX_LENGTH, type StoreFilter, type StoreSort, STORE_SORTS, type Vertical, VERTICALS, verticalLabel } from '@tawsela/shared';
import { useLocalSearchParams } from 'expo-router';
import { Search, SearchX, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fonts, fontSizes, radius, spacing } from '@/core/theme';
import { useDeliveryScope } from '@/features/addresses/chosen-address';
import { useCuisines, useStores } from '../api/stores';
import { CuisineCircles } from '../components/CuisineCircles';
import { FilterChips } from '../components/FilterChips';
import { RadioSheet } from '../components/RadioSheet';
import { StoreRow, StoreRowSkeleton } from '../components/StoreRow';
import { StoresTopBar } from '../components/StoresTopBar';

const TYPING_MS = 300;

/** A typed value, settled: it changes once typing pauses. */
function useSettled(value: string) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value.trim()), TYPING_MS);
    return () => clearTimeout(id);
  }, [value]);
  return settled;
}

const NO_FLOOR = 0;

/**
 * A store type's list (contract §8.3): search box, cuisine circles (restaurants), count, chips,
 * sort and rating sheets, store rows, empty state. Opened from a home tile, whose label is the title.
 */
export function StoresScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ vertical: string; title?: string }>();
  const vertical: Vertical = VERTICALS.includes(params.vertical as Vertical) ? (params.vertical as Vertical) : 'restaurant';
  const title = params.title || verticalLabel(vertical);

  const [text, setText] = useState('');
  const q = useSettled(text);
  const [cuisineId, setCuisineId] = useState<number>();
  const [filter, setFilter] = useState<StoreFilter>({});
  const [sheet, setSheet] = useState<'sort' | 'rating' | null>(null);

  const stores = useStores({ vertical, cuisineId, q, ...filter });
  const scope = useDeliveryScope();
  const cuisines = useCuisines(vertical === 'restaurant');
  const count = stores.data?.length ?? 0;

  const header = (
    <View style={styles.header}>
      <View style={styles.search}>
        <Search size={20} color={colors.ink2} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('stores.searchIn', { name: title })}
          placeholderTextColor={colors.ink2}
          maxLength={SEARCH_MAX_LENGTH}
          returnKeyType="search"
          style={styles.input}
        />
      </View>
      {cuisines.data?.length ? <CuisineCircles cuisines={cuisines.data} selected={cuisineId} onSelect={setCuisineId} /> : null}
      <AppText weight="bold" size={fontSizes.sectionTitle} style={styles.count}>
        {count ? t('stores.count', { count }) : t('stores.title')}
      </AppText>
      <FilterChips filter={filter} onChange={setFilter} onSort={() => setSheet('sort')} onRating={() => setSheet('rating')} />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StoresTopBar />
      <FlatList
        data={stores.isPending || scope.failed ? [] : (stores.data ?? [])}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => <StoreRow store={item} />}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={stores.isRefetching && !stores.isPlaceholderData} onRefresh={() => void stores.refetch()} tintColor={colors.primary} />}
        ListEmptyComponent={
          scope.failed ? (
            // Without the addresses the zone is unknown: never list every store (review F78).
            <View style={styles.errorBox}>
              <AppText color={colors.danger}>{t('address.loadFailed')}</AppText>
              <Button label={t('common.retry')} variant="soft" onPress={scope.retry} />
            </View>
          ) : stores.isPending ? (
            <View>
              {[0, 1, 2, 3].map((i) => (
                <StoreRowSkeleton key={i} />
              ))}
            </View>
          ) : stores.isError ? (
            <View style={styles.errorBox}>
              <AppText color={colors.danger}>{errorMessage(stores.error)}</AppText>
              <Button label={t('common.retry')} variant="soft" onPress={() => void stores.refetch()} />
            </View>
          ) : (
            <EmptyState icon={SearchX} title={t('stores.emptyTitle')} message={t('stores.emptyText')} />
          )
        }
      />
      <RadioSheet<StoreSort>
        visible={sheet === 'sort'}
        title={t('stores.sort')}
        value={filter.sort ?? 'default'}
        options={STORE_SORTS.map((s) => ({ value: s, label: t(`stores.sort.${s}`) }))}
        onChange={(sort) => setFilter((f) => ({ ...f, sort: sort === 'default' ? undefined : sort }))}
        onClose={() => setSheet(null)}
      />
      <RadioSheet<number>
        visible={sheet === 'rating'}
        title={t('stores.rating')}
        value={filter.minRating ?? NO_FLOOR}
        options={[
          { value: NO_FLOOR, label: t('stores.ratingAll') },
          ...RATING_FLOORS.map((r) => ({ value: r, label: t('stores.ratingFloor', { value: r.toFixed(1) }), icon: Star })),
        ]}
        onChange={(r) => setFilter((f) => ({ ...f, minRating: r === NO_FLOOR ? undefined : r }))}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: fontSizes.listTitle, color: colors.ink, textAlign: 'right' },
  count: { paddingHorizontal: spacing.lg },
  errorBox: { padding: spacing.lg, gap: spacing.md },
});
