import { isCustomizable, type Product } from '@tawsela/shared';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors } from '@/core/theme';

const SIZE = 40;
const ignore = () => undefined;

/**
 * The round button on a product's picture (contract §6.3): "+" adds it, "‹" opens the sheet when the
 * item has choices, and the count in orange once it is in the cart. Tapping the count does nothing
 * (customer/store/grid-count-badge.png); it still takes the tap so the item behind it does not open.
 */
export function AddButton({ product, count, onPress }: { product: Product; count: number; onPress: () => void }) {
  const t = useT();
  const custom = isCustomizable(product);
  if (count) {
    return (
      <Pressable accessible accessibilityLabel={t('store.inCart', { name: product.name, count })} onPress={ignore} hitSlop={6} style={[styles.button, styles.filled]}>
        <AppText weight="bold" color={colors.bg}>
          {count}
        </AppText>
      </Pressable>
    );
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t(custom ? 'store.choose' : 'store.add', { name: product.name })}
      onPress={onPress}
      hitSlop={6}
      scaleTo={0.9}
      style={styles.button}
    >
      {custom ? <DirectionalIcon icon={ChevronLeft} size={22} color={colors.primary} /> : <Plus size={22} color={colors.primary} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  filled: { backgroundColor: colors.primary },
});
