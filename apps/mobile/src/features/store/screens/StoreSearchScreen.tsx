import { SEARCH_MAX_LENGTH } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { errorMessage } from '@/core/api/error-message';
import { useT, useTextStart } from '@/core/i18n';
import { colors, fonts, fontSizes, radius, spacing } from '@/core/theme';
import { useStorePage } from '../api/store';
import { CartBar } from '../components/CartBar';
import { ProductGrid } from '../components/ProductItems';
import { ProductSheet } from '../components/ProductSheet';
import { useProductTaps } from '../hooks/useProductTaps';

/**
 * Tawsilty's store search (contract §8.4, store-search-*): "البحث" in orange, a white box with
 * "ابحث عن كل ما تريد عند <store>", and the matching products two to a row as you type. Nothing
 * typed, or nothing matching, leaves the page blank. The bar shows once something is in the cart [Open].
 */
export function StoreSearchScreen() {
  const textAlign = useTextStart();
  const t = useT();
  const storeId = Number(useLocalSearchParams<{ id: string }>().id);
  const page = useStorePage(storeId);
  const { cart, actions, sheet, setSheet, conflict } = useProductTaps(storeId);
  const [q, setQ] = useState('');
  const store = page.data;
  const menu = store?.categories.flatMap((c) => c.products) ?? [];
  const needle = q.trim().toLowerCase();
  const found = needle ? menu.filter((p) => p.name.toLowerCase().includes(needle)) : [];

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.bar}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} scaleTo={0.9} hitSlop={8}>
          <DirectionalIcon icon={ArrowRight} size={26} color={colors.ink} />
        </PressableScale>
        <AppText accessibilityRole="header" weight="bold" size={22} color={colors.primary} style={styles.title}>
          {t('store.searchTitle')}
        </AppText>
        <View style={styles.side} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.search}>
          <Search size={24} color={colors.ink} />
          <TextInput
            value={q}
            onChangeText={setQ}
            accessibilityLabel={t('store.search')}
            placeholder={store ? t('store.searchIn', { name: store.name }) : ''}
            maxLength={SEARCH_MAX_LENGTH}
            placeholderTextColor={colors.ink}
            returnKeyType="search"
            autoFocus
            style={[styles.input, { textAlign }]}
          />
        </View>
        {page.isError ? (
          <View style={styles.error}>
            <AppText color={colors.danger}>{errorMessage(page.error)}</AppText>
            <Button label={t('common.retry')} variant="soft" onPress={() => void page.refetch()} />
          </View>
        ) : found.length ? (
          <ProductGrid products={found} actions={actions} columns={2} />
        ) : null}
      </ScrollView>

      {store ? (
        <>
          <CartBar count={cart.count} total={cart.total} minimumOrder={cart.count ? store.minimumOrder : 0} />
          <ProductSheet product={sheet} conflict={conflict} menu={menu} countOf={cart.countOf} onAdd={cart.add} onOpen={setSheet} onClose={() => setSheet(null)} />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  side: { width: 26 },
  title: { flex: 1, textAlign: 'center' },
  content: { paddingBottom: 140 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: fontSizes.listTitle, color: colors.ink },
  error: { padding: spacing.xl, gap: spacing.md, alignItems: 'center' },
});
