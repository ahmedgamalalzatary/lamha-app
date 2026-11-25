import {
  CART_QUANTITY_LIMIT,
  choicesComplete,
  formatMoney,
  type Ingredient,
  isCustomizable,
  type OptionGroup,
  orderedTogether,
  type Product,
  toggleChoice,
  unitPrice,
} from '@tawsela/shared';
import { Image } from 'expo-image';
import { Check, Minus, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useReduceMotion } from '@/core/hooks/useReduceMotion';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { type CartConflict, CartConflictDialog } from '@/features/cart/components/CartConflictDialog';
import { AddButton } from './AddButton';
import { ProductPicture } from './ProductItems';
import { ProductPrice } from './ProductPrice';

interface Props {
  product: Product | null;
  /** The store's products in menu order, for "تُطلب معًا". */
  menu: Product[];
  countOf: (productId: number) => number;
  onAdd: (item: { product: Product; optionIds: number[]; removedIngredientIds: number[]; quantity: number }) => Promise<boolean>;
  /** Another product from "تُطلب معًا" that has choices: the sheet shows it instead. */
  onOpen: (product: Product) => void;
  onClose: () => void;
  conflict: CartConflict;
}

/**
 * The product sheet (contract §8.5): picture, ✕, name, description, option groups, base ingredients,
 * "تُطلب معًا", the stepper and "أضف للسلة <price>". Grey with "أكمل الاختيارات للإضافة للسلة"
 * until every required group has a choice.
 */
export function ProductSheet({ product, conflict, ...rest }: Props) {
  const reduceMotion = useReduceMotion();
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const replacing = conflict.storeName !== undefined;
  const closeConflict = () => {
    setReplaceError(null);
    conflict.cancel();
  };
  const replacement = useSubmit(async () => {
    setReplaceError(null);
    try {
      if (await conflict.replace()) rest.onClose();
    } catch (e) {
      setReplaceError(errorMessage(e));
    }
  });
  return (
    <Modal
      visible={product !== null || replacing}
      transparent
      animationType={reduceMotion ? 'none' : product ? 'slide' : 'fade'}
      onRequestClose={replacing ? closeConflict : rest.onClose}
    >
      <View style={styles.fill}>
        {product ? (
          <View style={styles.fill} accessibilityElementsHidden={replacing} importantForAccessibility={replacing ? 'no-hide-descendants' : 'auto'}>
            <SheetBody key={product.id} product={product} {...rest} />
          </View>
        ) : null}
        <CartConflictDialog
          storeName={conflict.storeName}
          cancel={closeConflict}
          replace={() => void replacement.run()}
          busy={replacement.busy}
          error={replaceError}
        />
      </View>
    </Modal>
  );
}

function SheetBody({ product, menu, countOf, onAdd, onOpen, onClose }: Omit<Props, 'product' | 'conflict'> & { product: Product }) {
  const locale = useLocale();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [chosen, setChosen] = useState<number[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [addError, setAddError] = useState<string | null>(null);
  const complete = choicesComplete(product, chosen);
  const total = unitPrice(product, chosen) * quantity;
  // "غير متوفر" items are never offered with this one.
  const together = orderedTogether(menu.filter((p) => p.active || p.id === product.id), product.id);
  const image = mediaUrl(product.image);
  const addLabel = complete ? `${t('product.add')} ${formatMoney(total, locale)}` : t('product.add');
  const submit = useSubmit(async (item: Parameters<Props['onAdd']>[0], closeOnSuccess: boolean) => {
    setAddError(null);
    try {
      if (await onAdd(item) && closeOnSuccess) onClose();
    } catch (e) {
      setAddError(errorMessage(e));
    }
  });

  const toggleIngredient = (i: Ingredient) => setRemoved((r) => (r.includes(i.id) ? r.filter((id) => id !== i.id) : [...r, i.id]));

  return (
    <View style={styles.fill} testID="product-sheet">
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { marginTop: insets.top + 40 }]}>
        <ScrollView contentContainerStyle={styles.content}>
          {image ? <Image source={{ uri: image }} contentFit="cover" style={styles.image} /> : <View style={styles.noImage} />}
          <View style={styles.head}>
            <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>
              {product.name}
            </AppText>
            {product.description ? <AppText color={colors.ink2}>{product.description}</AppText> : null}
          </View>

          {product.optionGroups.map((g) => (
            <Group key={g.id} group={g} chosen={chosen} onPick={(optionId) => setChosen((c) => toggleChoice(product, c, g.id, optionId))} />
          ))}

          {product.ingredients.length ? (
            <View style={styles.section}>
              <AppText weight="bold" size={fontSizes.listTitle}>
                {t('product.ingredients')}
              </AppText>
              <View style={styles.chips}>
                {product.ingredients.map((i) => {
                  const kept = !removed.includes(i.id);
                  return (
                    <PressableScale
                      key={i.id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={i.name}
                      accessibilityState={{ checked: kept }}
                      onPress={() => toggleIngredient(i)}
                      style={[styles.chip, kept ? styles.chipKept : styles.chipRemoved]}
                    >
                      {kept ? <Check size={16} color={colors.primary700} /> : <X size={16} color={colors.ink2} />}
                      <AppText weight="medium" color={kept ? colors.ink : colors.ink2} style={kept ? null : styles.struck}>
                        {i.name}
                      </AppText>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          ) : null}

          {together.length ? (
            <View testID="ordered-together" style={[styles.section, styles.together]}>
              <AppText weight="bold" size={fontSizes.sectionTitle}>
                {t('product.together')}
              </AppText>
              <AppText color={colors.ink2}>{t('product.togetherText')}</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {together.map((p) => (
                  <View key={p.id} style={styles.railItem}>
                    <View>
                      <ProductPicture product={p} size={RAIL} />
                      <View style={styles.railAdd}>
                        <AddButton
                          product={p}
                          count={countOf(p.id)}
                          onPress={() => (isCustomizable(p) ? onOpen(p) : void submit.run({ product: p, optionIds: [], removedIngredientIds: [], quantity: 1 }, false))}
                        />
                      </View>
                    </View>
                    <AppText size={fontSizes.body} numberOfLines={1}>
                      {p.name}
                    </AppText>
                    <ProductPrice product={p} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>

        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} scaleTo={0.9} style={styles.close}>
          <X size={24} color={colors.ink} />
        </PressableScale>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {addError ? <AppText accessibilityRole="alert" color={colors.danger}>{addError}</AppText> : null}
          {complete ? null : (
            <AppText color={colors.ink2} style={styles.center}>
              {t('product.incomplete')}
            </AppText>
          )}
          <View style={styles.footerRow}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={addLabel}
              accessibilityState={{ disabled: !complete || submit.busy, busy: submit.busy }}
              disabled={!complete || submit.busy}
              onPress={() => void submit.run({ product, optionIds: chosen, removedIngredientIds: removed, quantity }, true)}
              style={[styles.add, complete ? null : styles.addOff]}
            >
              <AppText weight="bold" color={complete ? colors.bg : colors.ink2}>
                {t('product.add')}
              </AppText>
              {complete ? (
                <AppText weight="semibold" color={colors.bg}>
                  {formatMoney(total, locale)}
                </AppText>
              ) : null}
            </PressableScale>
            <View style={styles.stepper}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('product.more')}
                disabled={quantity >= CART_QUANTITY_LIMIT}
                onPress={() => setQuantity((q) => Math.min(q + 1, CART_QUANTITY_LIMIT))}
                hitSlop={8}
              >
                <Plus size={22} color={colors.primary} />
              </PressableScale>
              <AppText weight="bold" size={fontSizes.listTitle}>
                {quantity}
              </AppText>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('product.less')}
                accessibilityState={{ disabled: quantity === 1 }}
                disabled={quantity === 1}
                onPress={() => setQuantity((q) => q - 1)}
                hitSlop={8}
              >
                <Minus size={22} color={quantity === 1 ? colors.line : colors.primary} />
              </PressableScale>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/** An option group: title, "مطلوب", "اختر 1", and its rows with the price change. */
function Group({ group, chosen, onPick }: { group: OptionGroup; chosen: number[]; onPick: (optionId: number) => void }) {
  const locale = useLocale();
  const t = useT();
  const single = group.maxChoices === 1;
  return (
    <View style={styles.section}>
      <View style={styles.groupHead}>
        <AppText weight="bold" size={fontSizes.listTitle}>
          {group.title}
        </AppText>
        {group.required ? (
          <View style={styles.requiredTag}>
            <AppText weight="semibold" size={fontSizes.caption} color={colors.bg}>
              {t('product.required')}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText color={colors.ink2} size={fontSizes.caption}>
        {single ? t('product.chooseOne') : t('product.chooseUpTo', { n: group.maxChoices })}
      </AppText>
      {group.options.map((o) => {
        const on = chosen.includes(o.id);
        const label = o.priceDelta ? `${o.name} (+${formatMoney(o.priceDelta, locale)})` : o.name;
        return (
          <PressableScale
            key={o.id}
            accessibilityRole={single ? 'radio' : 'checkbox'}
            accessibilityLabel={label}
            accessibilityState={single ? { selected: on } : { checked: on }}
            onPress={() => onPick(o.id)}
            scaleTo={0.99}
            style={styles.option}
          >
            <AppText weight="medium" style={styles.optionName}>
              {o.name}
            </AppText>
            {o.priceDelta ? <AppText color={colors.ink2}>{`(+${formatMoney(o.priceDelta, locale)})`}</AppText> : null}
            <View style={[single ? styles.radio : styles.box, on ? styles.markOn : null]}>{on ? <Check size={14} color={colors.bg} /> : null}</View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const RAIL = 140;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdrop },
  sheet: { flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: radius.lg + 8, borderTopRightRadius: radius.lg + 8, overflow: 'hidden' },
  content: { paddingBottom: spacing.xl },
  image: { width: '100%', height: 300 },
  noImage: { height: 72 },
  close: {
    position: 'absolute',
    top: spacing.md,
    start: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: { padding: spacing.lg, gap: spacing.sm, alignItems: 'flex-start', borderBottomWidth: 8, borderBottomColor: colors.input },
  section: { padding: spacing.lg, gap: spacing.md, alignItems: 'stretch', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requiredTag: { backgroundColor: colors.black, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  optionName: { flex: 1 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  markOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1.5 },
  chipKept: { borderColor: colors.primary400, backgroundColor: colors.bg },
  chipRemoved: { borderColor: colors.line, backgroundColor: colors.input },
  struck: { textDecorationLine: 'line-through' },
  together: { backgroundColor: colors.bgWarm },
  rail: { gap: spacing.md },
  railItem: { width: RAIL, gap: spacing.xs, alignItems: 'flex-start' },
  railAdd: { position: 'absolute', bottom: spacing.sm, end: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  add: {
    flex: 1,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary700,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  addOff: { backgroundColor: colors.input, justifyContent: 'center' },
  stepper: {
    width: 140,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  center: { textAlign: 'center' },
});
