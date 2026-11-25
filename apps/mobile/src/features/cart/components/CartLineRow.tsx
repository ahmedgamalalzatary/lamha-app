import { CART_QUANTITY_LIMIT, type CustomerCart, formatMoney } from '@tawsela/shared';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { ProductPicture } from '@/features/store/components/ProductItems';

type Line = CustomerCart['lines'][number];

export function CartLineRow({ line, busy, onAdjust, onRemove }: {
  line: Line;
  busy: boolean;
  onAdjust: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { product, quantity } = line;
  const names = product.optionGroups.flatMap((group) => group.options)
    .filter((option) => line.optionIds.includes(option.id)).map((option) => option.name);
  const removed = product.ingredients.filter((ingredient) => line.removedIngredientIds.includes(ingredient.id)).map((ingredient) => ingredient.name);
  const separator = locale === 'ar' ? '، ' : ', ';
  const canAdd = line.available && quantity < CART_QUANTITY_LIMIT;

  return (
    <View style={styles.row}>
      <View style={styles.details}>
        <AppText weight="bold" size={fontSizes.listTitle}>{product.name}</AppText>
        {names.length ? <AppText color={colors.ink2}>{names.join(separator)}</AppText> : null}
        {removed.length ? <AppText color={colors.danger}>{t('cart.without', { ingredients: removed.join(separator) })}</AppText> : null}
        {line.available ? null : <AppText color={colors.danger}>{t('errors.CART_ITEM_UNAVAILABLE')}</AppText>}
        <AppText weight="semibold" style={styles.price}>{formatMoney(line.unitPrice, locale)}</AppText>
      </View>
      <View>
        <ProductPicture product={product} size={132} />
        <View style={styles.stepper}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('cart.increase', { name: product.name })}
            disabled={busy || !canAdd}
            onPress={() => onAdjust(1)}
            style={styles.step}
          >
            <Plus size={21} color={canAdd ? colors.primary700 : colors.ink2} />
          </PressableScale>
          <AppText weight="bold">{quantity}</AppText>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t(quantity === 1 ? 'cart.removeItem' : 'cart.decrease', { name: product.name })}
            disabled={busy}
            onPress={quantity === 1 ? onRemove : () => onAdjust(-1)}
            style={styles.step}
          >
            {quantity === 1 ? <Trash2 size={19} color={colors.primary700} /> : <Minus size={21} color={colors.primary700} />}
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg },
  details: { flex: 1, gap: spacing.xs },
  price: { marginTop: 'auto', paddingTop: spacing.sm },
  stepper: {
    position: 'absolute', start: 5, end: 5, bottom: 5, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderRadius: radius.pill, backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  step: { minHeight: 44, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
});
