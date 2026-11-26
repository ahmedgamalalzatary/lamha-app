import { formatMoney, type Product, SEARCH_MAX_LENGTH, SEARCH_SCOPES, type SearchResult, type SearchScope } from '@tawsela/shared';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { ArrowRight, ArrowUpLeft, ChevronLeft, Search, ShoppingBasket, Store, UtensilsCrossed, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { type TranslationKey, useLocale, useT, useTextStart } from '@/core/i18n';
import { colors, fonts, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { useDeliveryScope } from '@/features/addresses/chosen-address';
import { useSearch, useSuggestions } from '@/features/stores/api/stores';
import { StoreMeta } from '@/features/stores/components/StoreMeta';

const TAB_LABEL: Record<SearchScope, TranslationKey> = { all: 'search.all', restaurants: 'search.restaurants', others: 'search.others' };
const TYPING_MS = 250;

const openStore = (id: number) => router.push(`/store/${id}` as Href);
/** A matched product opens its store on that product's sheet (review F81). */
const openProduct = (p: Product) => router.push(`/store/${p.storeId}?product=${p.id}` as Href);

/** The typed text once typing pauses, for the suggestions. */
function useSettled(value: string) {
  const [settled, setSettled] = useState(value.trim());
  useEffect(() => {
    const id = setTimeout(() => setSettled(value.trim()), TYPING_MS);
    return () => clearTimeout(id);
  }, [value]);
  return settled;
}

function Tabs({ scope, onChange }: { scope: SearchScope; onChange: (s: SearchScope) => void }) {
  const t = useT();
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {SEARCH_SCOPES.map((s) => {
        const on = s === scope;
        return (
          <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(s)} style={styles.tab}>
            <AppText weight={on ? 'bold' : 'regular'} color={on ? colors.ink : colors.ink2} size={fontSizes.listTitle}>
              {t(TAB_LABEL[s])}
            </AppText>
            <View style={[styles.tabLine, on && styles.tabLineOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** While typing (§8.13): "ابحث عن «…»", then product names "في المطاعم" with ↖ to put the name in the box. */
function Suggestions({ text, scope, onSearch, onFill }: { text: string; scope: SearchScope; onSearch: (q: string) => void; onFill: (q: string) => void }) {
  const t = useT();
  const suggestions = useSuggestions(useSettled(text), scope);
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <PressableScale accessibilityRole="button" accessibilityLabel={t('search.for', { q: text.trim() })} onPress={() => onSearch(text)} style={styles.line}>
        <View style={[styles.lineIcon, styles.lineIconOrange]}>
          <Search size={20} color={colors.primary} />
        </View>
        <AppText weight="bold" size={fontSizes.listTitle} numberOfLines={1} style={styles.flex}>
          {t('search.for', { q: text.trim() })}
        </AppText>
        <DirectionalIcon icon={ChevronLeft} size={20} color={colors.ink2} />
      </PressableScale>
      {(suggestions.data ?? []).map((s) => (
        <View key={`${s.name}-${s.vertical}`} style={styles.line}>
          <PressableScale accessibilityRole="button" accessibilityLabel={s.name} onPress={() => onSearch(s.name)} style={styles.suggestion}>
            <View style={styles.lineIcon}>
              {s.vertical === 'restaurant' ? <UtensilsCrossed size={20} color={colors.ink2} /> : <ShoppingBasket size={20} color={colors.ink2} />}
            </View>
            <View style={styles.flex}>
              <AppText weight="bold" size={fontSizes.listTitle} numberOfLines={1}>
                {s.name}
              </AppText>
              <AppText color={colors.ink2} size={fontSizes.body}>
                {t(s.vertical === 'restaurant' ? 'search.inRestaurants' : 'search.inStores')}
              </AppText>
            </View>
          </PressableScale>
          <PressableScale accessibilityRole="button" accessibilityLabel={t('search.fill')} onPress={() => onFill(s.name)} hitSlop={10} scaleTo={0.85}>
            <DirectionalIcon icon={ArrowUpLeft} size={22} color={colors.ink2} />
          </PressableScale>
        </View>
      ))}
    </ScrollView>
  );
}

function ProductCard({ product }: { product: Product }) {
  const locale = useLocale();
  const uri = mediaUrl(product.image);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={product.name} onPress={() => openProduct(product)} style={styles.product}>
      <View style={styles.productImage}>
        {uri ? <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} transition={150} /> : <UtensilsCrossed size={32} color={colors.primary} />}
      </View>
      <AppText weight="bold" numberOfLines={1}>
        {product.name}
      </AppText>
      <AppText weight="bold">{formatMoney(product.price, locale)}</AppText>
    </PressableScale>
  );
}

/** A result (§8.13): the store (logo, name, rating, fee), then its matching products. */
function Result({ result }: { result: SearchResult }) {
  const { store, products } = result;
  const logo = mediaUrl(store.logo ?? store.cover);
  return (
    <View style={styles.result}>
      <PressableScale accessibilityRole="button" accessibilityLabel={store.name} onPress={() => openStore(store.id)} style={styles.resultStore}>
        <View style={styles.logo}>{logo ? <Image source={{ uri: logo }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <Store size={26} color={colors.primary} />}</View>
        <View style={styles.resultText}>
          <AppText weight="bold" size={fontSizes.listTitle} numberOfLines={1}>
            {store.name}
          </AppText>
          <StoreMeta store={store} time={false} />
        </View>
      </PressableScale>
      {products.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.products}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Results({ q, scope }: { q: string; scope: SearchScope }) {
  const t = useT();
  const results = useSearch(q, scope);
  const delivery = useDeliveryScope();
  // Without the addresses the zone is unknown: never search every store (review F78).
  if (delivery.failed)
    return (
      <View style={styles.result}>
        <AppText color={colors.danger}>{t('address.loadFailed')}</AppText>
        <Button label={t('common.retry')} variant="soft" onPress={delivery.retry} />
      </View>
    );
  if (results.isPending)
    return (
      <View style={styles.result}>
        <Skeleton style={{ width: '70%', height: 64, borderRadius: radius.md }} />
        <Skeleton style={{ width: 150, height: 150, borderRadius: radius.md }} />
      </View>
    );
  if (results.isError)
    return (
      <View style={styles.result}>
        <AppText color={colors.danger}>{errorMessage(results.error)}</AppText>
        <Button label={t('common.retry')} variant="soft" onPress={() => void results.refetch()} />
      </View>
    );
  if (!results.data.length) return <EmptyState icon={Search} title={t('search.none')} message={t('search.noneText')} />;
  return (
    <FlatList
      data={results.data}
      keyExtractor={(r) => String(r.store.id)}
      renderItem={({ item }) => <Result result={item} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

/**
 * Search (contract §8.13): tabs الكل · مطاعم · متاجر أخرى; the empty prompt, suggestions while
 * typing, then each matching store with its matching products.
 */
export function SearchScreen() {
  const textAlign = useTextStart();
  const t = useT();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const search = (q: string) => {
    setText(q);
    setSubmitted(q.trim());
  };
  const showingResults = submitted !== '' && submitted === text.trim();

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.box}>
          <Search size={22} color={colors.ink2} />
          <TextInput
            accessibilityLabel={t('search.label')}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => search(text)}
            placeholder={t('search.placeholder')}
            maxLength={SEARCH_MAX_LENGTH}
            placeholderTextColor={colors.ink2}
            returnKeyType="search"
            autoFocus
            style={[styles.input, { textAlign }]}
          />
          {text ? (
            <PressableScale accessibilityRole="button" accessibilityLabel={t('search.clear')} onPress={() => search('')} hitSlop={10} scaleTo={0.85}>
              <X size={22} color={showingResults ? colors.ink2 : colors.primary} />
            </PressableScale>
          ) : null}
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={8} scaleTo={0.9}>
          <DirectionalIcon icon={ArrowRight} size={26} color={colors.ink} />
        </PressableScale>
      </View>
      <Tabs scope={scope} onChange={setScope} />
      {!text.trim() ? (
        <View style={styles.prompt}>
          <Search size={88} color={colors.line} strokeWidth={2.5} />
          <AppText weight="bold" size={fontSizes.listTitle}>
            {t('search.emptyTitle')}
          </AppText>
          <AppText color={colors.ink2} size={fontSizes.body}>
            {t('search.emptyText')}
          </AppText>
        </View>
      ) : showingResults ? (
        <Results q={submitted} scope={scope} />
      ) : (
        <Suggestions text={text} scope={scope} onSearch={search} onFill={setText} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 58,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.input,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: fontSizes.listTitle, color: colors.ink },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flex: 1, alignItems: 'center', paddingTop: spacing.md, gap: spacing.md },
  tabLine: { height: 3, width: 64, borderRadius: 2, backgroundColor: 'transparent' },
  tabLineOn: { backgroundColor: colors.primary },
  prompt: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  suggestion: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lineIcon: { width: sizes.touch, height: sizes.touch, borderRadius: sizes.touch / 2, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  lineIconOrange: { backgroundColor: colors.primary50 },
  result: { gap: spacing.lg, padding: spacing.lg },
  resultStore: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resultText: { flex: 1, gap: spacing.sm, alignItems: 'flex-start' },
  logo: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  products: { gap: spacing.md },
  product: { width: 150, gap: spacing.xs },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
