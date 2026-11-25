import { CART_MODES, CART_NOTE_LIMIT, type CartResponse, type CustomerCart, formatMoney, ORDERED_TOGETHER } from '@tawsela/shared';
import { router } from 'expo-router';
import { Check, MessageSquare, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useLocale, useT, useTextStart } from '@/core/i18n';
import { colors, fonts, fontSizes, radius, spacing } from '@/core/theme';
import { useStorePage } from '@/features/store/api/store';
import { AddButton } from '@/features/store/components/AddButton';
import { ProductPicture } from '@/features/store/components/ProductItems';
import { ProductPrice } from '@/features/store/components/ProductPrice';
import { ProductSheet } from '@/features/store/components/ProductSheet';
import { useProductTaps } from '@/features/store/hooks/useProductTaps';
import { cartApi, useCart } from '../api/cart';
import { CartLineRow } from '../components/CartLineRow';

export function CartScreen() {
  const t = useT();
  const { cart, query, run } = useCart();
  const browse = () => router.navigate('/customer');

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton variant="square" onPress={() => (router.canGoBack() ? router.back() : browse())} />
        <View style={styles.grow}>
          <AppText accessibilityRole="header" size={fontSizes.sectionTitle} weight="bold">{t('cart.title')}</AppText>
          {cart ? <AppText color={colors.ink2} numberOfLines={1}>{cart.store.name}</AppText> : null}
        </View>
      </View>
      {cart ? (
        <CartContents key={cart.id} cart={cart} run={run} refresh={() => void query.refetch()} refreshing={query.isRefetching} />
      ) : query.isPending ? (
        <View style={styles.section}>
          <Skeleton style={styles.lineSkeleton} />
          <Skeleton style={styles.noteSkeleton} />
          <Skeleton style={styles.noteSkeleton} />
        </View>
      ) : query.isError ? (
        <View style={styles.center}>
          <AppText color={colors.danger}>{errorMessage(query.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <View style={styles.empty}>
          <EmptyState icon={ShoppingCart} title={t('cart.empty')} message={t('cart.emptyMessage')} />
          <Button label={t('cart.browse')} onPress={browse} />
        </View>
      )}
    </SafeAreaView>
  );
}

function CartContents({ cart, run, refresh, refreshing }: {
  cart: CustomerCart;
  run: (operation: () => Promise<CartResponse>) => Promise<CartResponse>;
  refresh: () => void;
  refreshing: boolean;
}) {
  const t = useT();
  const textAlign = useTextStart();
  const [removing, setRemoving] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const edit = useSubmit(async (operation: () => Promise<CartResponse>) => { await run(operation); });
  const saveNote = useSubmit(async (value: string) => {
    setNoteError(null);
    try {
      await run(() => cartApi.edit({ cartId: cart.id, note: value.trim() }));
      setNote(null);
    } catch (e) {
      setNoteError(errorMessage(e));
    }
  });
  const validate = useSubmit(async () => {
    await run(cartApi.validate);
    toast.show(t('cart.checkoutPending'));
  });
  const busy = edit.busy || saveNote.busy || validate.busy;

  return (
    <>
      <ScrollView
        style={styles.grow}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.section}>
          {cart.lines.map((line) => (
            <CartLineRow
              key={line.id}
              line={line}
              busy={busy}
              onAdjust={(delta) => void edit.run(() => cartApi.adjust(line.id, delta))}
              onRemove={() => setRemoving(line.id)}
            />
          ))}
        </View>
        <CartSuggestions cart={cart} />
        <View style={styles.section}>
          {cart.store.pickupAllowed ? (
            <View accessibilityRole="radiogroup" style={styles.modes}>
              {CART_MODES.map((mode) => {
                const checked = mode === cart.mode;
                return (
                  <PressableScale
                    key={mode}
                    accessibilityRole="radio"
                    accessibilityLabel={t(`cart.${mode}`)}
                    accessibilityState={{ checked, disabled: busy }}
                    disabled={busy}
                    onPress={() => {
                      if (!checked) void edit.run(() => cartApi.edit({ cartId: cart.id, mode }));
                    }}
                    style={[styles.mode, checked && styles.modeSelected]}
                  >
                    <AppText weight={checked ? 'semibold' : 'regular'}>{t(`cart.${mode}`)}</AppText>
                    {checked ? <Check size={16} color={colors.primary700} /> : null}
                  </PressableScale>
                );
              })}
            </View>
          ) : null}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('cart.note')}
            onPress={() => {
              setNoteError(null);
              setNote(cart.note);
            }}
            style={styles.note}
          >
            <MessageSquare size={23} color={colors.ink2} />
            <View style={styles.grow}>
              <AppText weight="bold">{t('cart.note')}</AppText>
              <AppText color={colors.ink2} numberOfLines={2}>{cart.note || t('cart.noteHint')}</AppText>
            </View>
          </PressableScale>
          <PaymentSummary cart={cart} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('cart.addMore')}
          onPress={() => router.navigate(`/store/${cart.store.id}`)}
          style={[styles.action, styles.outline]}
        >
          <AppText weight="bold" style={styles.centerText}>{t('cart.addMore')}</AppText>
        </PressableScale>
        <Button label={t('cart.continue')} onPress={() => void validate.run()} style={styles.action} disabled={edit.busy} loading={validate.busy} />
      </View>
      <ConfirmDialog
        visible={removing !== null}
        title={t('cart.deleteTitle')}
        message={t('cart.deleteMessage')}
        confirmLabel={t('cart.delete')}
        onConfirm={() => {
          if (removing !== null) void edit.run(() => cartApi.remove(removing));
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
      <BottomSheet visible={note !== null} onClose={() => setNote(null)}>
        <TextInput
          accessibilityLabel={t('cart.note')}
          placeholder={t('cart.note')}
          placeholderTextColor={colors.ink2}
          value={note ?? ''}
          onChangeText={setNote}
          maxLength={CART_NOTE_LIMIT}
          multiline
          autoFocus
          style={[styles.noteInput, { textAlign }]}
        />
        {noteError ? <AppText accessibilityRole="alert" color={colors.danger}>{noteError}</AppText> : null}
        <AppText color={colors.ink2} style={styles.counter}>{`${note?.length ?? 0}/${CART_NOTE_LIMIT}`}</AppText>
        <Button label={t('cart.done')} loading={saveNote.busy} onPress={() => void saveNote.run(note ?? '')} />
      </BottomSheet>
    </>
  );
}

function CartSuggestions({ cart }: { cart: CustomerCart }) {
  const t = useT();
  const page = useStorePage(cart.store.id);
  const { cart: actionsCart, actions, conflict, sheet, setSheet } = useProductTaps(cart.store.id);
  const menu = page.data?.categories.flatMap((category) => category.products).filter((product) => product.active) ?? [];
  const inCart = new Set(cart.lines.map((line) => line.product.id));
  const suggestions = menu.filter((product) => !inCart.has(product.id)).slice(0, ORDERED_TOGETHER);
  if (!suggestions.length) return null;

  return (
    <View style={styles.upsell}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle} style={styles.upsellTitle}>{t('cart.upsell')}</AppText>
      <ScrollView horizontal contentContainerStyle={styles.upsellRail} showsHorizontalScrollIndicator={false}>
        {suggestions.map((product) => (
          <View key={product.id} style={styles.suggestion}>
            <PressableScale accessibilityRole="button" accessibilityLabel={product.name} onPress={() => actions.open(product)}>
              <ProductPicture product={product} size={120} />
            </PressableScale>
            <View style={styles.upsellAdd}>
              <AddButton product={product} count={actions.countOf(product.id)} onPress={() => actions.add(product)} />
            </View>
            <AppText numberOfLines={2}>{product.name}</AppText>
            <ProductPrice product={product} />
          </View>
        ))}
      </ScrollView>
      <ProductSheet product={sheet} conflict={conflict} menu={menu} countOf={actions.countOf} onAdd={actionsCart.add} onOpen={setSheet} onClose={() => setSheet(null)} />
    </View>
  );
}

function PaymentSummary({ cart }: { cart: CustomerCart }) {
  const t = useT();
  const locale = useLocale();
  const total = formatMoney(cart.total, locale);
  return (
    <View style={styles.summary}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.listTitle}>{t('cart.summary')}</AppText>
      <View style={styles.summaryRow}>
        <AppText color={colors.ink2}>{t('cart.count')}</AppText><AppText weight="semibold">{cart.count}</AppText>
      </View>
      <View style={styles.summaryRow}>
        <AppText color={colors.ink2}>{t('cart.subtotal')}</AppText><AppText weight="semibold">{total}</AppText>
      </View>
      <View style={[styles.summaryRow, styles.total]}>
        <AppText weight="bold">{t('cart.total')}</AppText><AppText weight="bold" color={colors.primary700}>{total}</AppText>
      </View>
      {cart.mode === 'delivery' ? <AppText color={colors.ink2} size={fontSizes.body}>{t('cart.deliveryHint')}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grow: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  center: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg },
  empty: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  body: { flexGrow: 1, paddingBottom: spacing.xl, gap: spacing.lg },
  section: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  lineSkeleton: { height: 132, borderRadius: radius.lg },
  noteSkeleton: { height: 66, borderRadius: radius.lg },
  upsell: { backgroundColor: '#F6F3ED', paddingVertical: spacing.xl, gap: spacing.lg },
  upsellTitle: { paddingHorizontal: spacing.lg },
  upsellRail: { paddingHorizontal: spacing.lg, gap: spacing.md },
  suggestion: { width: 120, gap: spacing.xs },
  upsellAdd: { position: 'absolute', top: 76, end: spacing.xs },
  modes: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  mode: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  modeSelected: { borderColor: colors.primary700, backgroundColor: colors.primary50 },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg },
  noteInput: { minHeight: 124, borderColor: colors.ink, borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
    fontFamily: fonts.regular, fontSize: fontSizes.listTitle, color: colors.ink, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end' },
  summary: { gap: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  total: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingTop: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  action: { flex: 1, minHeight: 50, borderRadius: radius.pill, paddingHorizontal: spacing.sm },
  outline: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.ink },
  centerText: { textAlign: 'center' },
});
