import { formatMoney, type Product } from '@tawsela/shared';
import { Package, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { toast } from '@/components/Toast';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useProductAvailability, usePartnerMenu } from '../api/partner';

const ALL = 0;

/**
 * منتجات (contract §9): search, category tabs, and each product with its image, name, price and the
 * availability switch. Adding and editing products is on /partner (§11.1). [Open] Tawsilty's screen is
 * not captured.
 */
export function PartnerProductsScreen() {
  const t = useT();
  const { categories, products } = usePartnerMenu();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const mains = categories.data?.filter((c) => c.parentId === null) ?? [];
  const inTab = (p: Product) => {
    if (category === ALL || p.categoryId === category) return true;
    return categories.data?.find((c) => c.id === p.categoryId)?.parentId === category;
  };
  const q = query.trim();
  const shown = products.data?.filter((p) => inTab(p) && (!q || p.name.includes(q))) ?? [];

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle} style={styles.title}>
        {t('tabs.products')}
      </AppText>
      <View style={styles.search}>
        <TextField icon={Search} value={query} onChangeText={setQuery} placeholder={t('partner.searchProducts')} accessibilityLabel={t('partner.searchProducts')} clearable />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {[{ id: ALL, name: t('partner.all') }, ...mains].map((c) => {
            const on = c.id === category;
            return (
              <PressableScale
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                accessibilityState={{ selected: on }}
                onPress={() => setCategory(c.id)}
                style={[styles.tab, on && styles.tabOn]}
              >
                <AppText weight="semibold" color={on ? colors.bg : colors.ink2}>
                  {c.name}
                </AppText>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>
      {products.isPending || categories.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : products.isError || categories.isError ? (
        <View style={styles.center}>
          <AppText color={colors.danger}>{errorMessage(products.error ?? categories.error)}</AppText>
          <Button
            label={t('common.retry')}
            variant="soft"
            onPress={() => {
              void products.refetch();
              void categories.refetch();
            }}
          />
        </View>
      ) : shown.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon={Package} title={t('partner.noProducts')} />
        </View>
      ) : (
        <FlatList data={shown} keyExtractor={(p) => String(p.id)} contentContainerStyle={styles.list} renderItem={({ item }) => <ProductRow product={item} />} />
      )}
    </SafeAreaView>
  );
}

function ProductRow({ product: p }: { product: Product }) {
  const t = useT();
  const locale = useLocale();
  const availability = useProductAvailability();
  const uri = mediaUrl(p.image);
  return (
    <View style={styles.row}>
      <View style={styles.photo}>{uri ? <Image source={{ uri }} style={styles.photoImage} accessibilityIgnoresInvertColors /> : null}</View>
      <View style={styles.grow}>
        <AppText weight="semibold" size={fontSizes.listTitle} color={p.active ? colors.ink : colors.ink2}>
          {p.name}
        </AppText>
        <AppText weight="semibold" color={colors.primary}>
          {formatMoney(p.price, locale)}
        </AppText>
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={t('partner.available', { name: p.name })}
        value={p.active}
        trackColor={{ true: colors.primary, false: colors.line }}
        thumbColor={colors.bg}
        onValueChange={(active) =>
          availability.mutate({ productId: p.id, active }, { onError: (e) => toast.show(errorMessage(e), 'error') })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  search: { paddingHorizontal: spacing.lg },
  tabs: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.input },
  tabOn: { backgroundColor: colors.primary },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  skeleton: { height: 72, borderRadius: radius.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  photo: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.input, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  grow: { flex: 1 },
});
