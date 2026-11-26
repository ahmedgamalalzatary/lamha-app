import type { CartSummary } from '@tawsela/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronLeft, ShoppingBag, ShoppingCart, Store, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { useSession } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { cartApi, cartKeys, useCarts } from '../api/cart';

/**
 * "سلاتي" (contract §8.6): a card per store's cart, which opens it, and a trash icon that asks
 * "حذف كل السلات؟". Empty: "سلتك فارغة" with "تصفح المنتجات".
 */
export function MyCartsScreen() {
  const t = useT();
  const query = useCarts();
  const client = useQueryClient();
  const userId = useSession((s) => s.user?.id);
  const [confirming, setConfirming] = useState(false);
  const carts = query.data?.carts ?? [];
  const clearAll = useSubmit(async () => {
    setConfirming(false);
    try {
      client.setQueryData(cartKeys.list(userId), await cartApi.clearAll());
      client.removeQueries({ queryKey: ['cart', userId] });
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  });

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <AppText accessibilityRole="header" size={fontSizes.screenTitle} weight="bold" style={styles.grow}>{t('cart.mine')}</AppText>
        {carts.length ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('cart.deleteAll')}
            disabled={clearAll.busy}
            onPress={() => setConfirming(true)}
            style={styles.trash}
          >
            <Trash2 size={24} color={colors.ink} />
          </PressableScale>
        ) : null}
      </View>
      {carts.length ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
        >
          {carts.map((cart) => <CartCard key={cart.id} cart={cart} />)}
        </ScrollView>
      ) : query.isPending ? (
        <View style={styles.list}>
          <Skeleton style={styles.cardSkeleton} />
          <Skeleton style={styles.cardSkeleton} />
        </View>
      ) : query.isError ? (
        <View style={styles.center}>
          <AppText color={colors.danger}>{errorMessage(query.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <View style={styles.empty}>
          <EmptyState icon={ShoppingCart} title={t('cart.empty')} message={t('cart.emptyMessage')} />
          <Button label={t('cart.browse')} onPress={() => router.navigate('/customer')} />
        </View>
      )}
      <ConfirmDialog
        visible={confirming}
        title={t('cart.deleteAllTitle')}
        message={t('cart.deleteAllMessage')}
        confirmLabel={t('cart.delete')}
        onConfirm={() => void clearAll.run()}
        onCancel={() => setConfirming(false)}
      />
    </SafeAreaView>
  );
}

function CartCard({ cart }: { cart: CartSummary }) {
  const t = useT();
  const logo = mediaUrl(cart.store.logo);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${cart.store.name}, ${t('cart.items', { count: cart.items })}`}
      onPress={() => router.push(`/cart/${cart.store.id}`)}
      scaleTo={0.98}
      style={styles.card}
    >
      <View style={styles.logo}>
        {logo ? <Image source={{ uri: logo }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <Store size={32} color={colors.primary} />}
      </View>
      <View style={styles.grow}>
        <AppText weight="bold" size={fontSizes.listTitle} numberOfLines={1}>{cart.store.name}</AppText>
        <View style={styles.items}>
          <ShoppingBag size={16} color={colors.primary} />
          <AppText color={colors.ink2}>{t('cart.items', { count: cart.items })}</AppText>
        </View>
      </View>
      <View style={styles.open}>
        <DirectionalIcon icon={ChevronLeft} size={20} color={colors.primary} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grow: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, minHeight: 64 },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg },
  empty: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  cardSkeleton: { height: 112, borderRadius: radius.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  logo: { width: 80, height: 80, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.primary50,
    alignItems: 'center', justifyContent: 'center' },
  items: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  open: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
});
