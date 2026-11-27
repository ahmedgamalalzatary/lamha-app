import { Heart } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';
import { useFavorites } from '@/features/store/api/store';
import { StoreRow, StoreRowSkeleton } from '@/features/stores/components/StoreRow';

/**
 * المفضلة (contract §8.14, customer/account/favorites-empty-state.png): the stores saved with the
 * heart, as store rows; "لا توجد خدمات مفضلة" when there are none.
 */
export function FavoritesScreen() {
  const t = useT();
  const favorites = useFavorites();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.bar}>
        <BackButton />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle} style={styles.title}>
          {t('favorites.title')}
        </AppText>
        <View style={styles.side} />
      </View>
      <FlatList
        data={favorites.data ?? []}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => <StoreRow store={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={favorites.isRefetching} onRefresh={() => void favorites.refetch()} tintColor={colors.primary} />}
        ListEmptyComponent={
          favorites.isPending ? (
            <View>
              {[0, 1, 2].map((i) => (
                <StoreRowSkeleton key={i} />
              ))}
            </View>
          ) : favorites.isError ? (
            <View style={styles.errorBox}>
              <AppText color={colors.danger}>{errorMessage(favorites.error)}</AppText>
              <Button label={t('common.retry')} variant="soft" onPress={() => void favorites.refetch()} />
            </View>
          ) : (
            <EmptyState icon={Heart} title={t('favorites.emptyTitle')} message={t('favorites.emptyText')} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  title: { flex: 1, textAlign: 'center' },
  side: { width: 26 },
  list: { flexGrow: 1, backgroundColor: colors.surface },
  errorBox: { padding: spacing.lg, gap: spacing.md },
});
