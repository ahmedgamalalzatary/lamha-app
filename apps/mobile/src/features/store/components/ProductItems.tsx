import { isCustomizable, type Product } from '@tawsela/shared';
import { Image } from 'expo-image';
import { UtensilsCrossed } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { mediaUrl } from '@/core/api/client';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { AddButton } from './AddButton';
import { ProductPrice } from './ProductPrice';

export interface ProductActions {
  /** Opens the product sheet. */
  open: (product: Product) => void;
  /** "+": adds a simple item at once; an item with choices opens the sheet. */
  add: (product: Product) => void;
  countOf: (productId: number) => number;
}

/** A product's picture, or a soft placeholder when it has none. */
export function ProductPicture({ product, size }: { product: Product; size?: number }) {
  const uri = mediaUrl(product.image);
  return (
    <View style={[styles.picture, size ? { width: size, height: size } : styles.square]}>
      {uri ? <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} transition={150} /> : <UtensilsCrossed size={28} color={colors.line} />}
    </View>
  );
}

const ROW_IMAGE = 150;

// The add button sits on the picture but is not inside the item's pressable: a screen reader then
// reaches both the item (opens the sheet) and the button.

/**
 * A product in the restaurant layout (contract §8.4 list): name and price on one side, the picture with
 * its button on the other, "قابل للتخصيص" under items with choices.
 */
export function ProductRow({ product, actions }: { product: Product; actions: ProductActions }) {
  const t = useT();
  return (
    <View>
      <PressableScale accessibilityRole="button" accessibilityLabel={product.name} onPress={() => actions.open(product)} scaleTo={0.99} style={styles.row}>
        <View style={styles.rowText}>
          <AppText weight="semibold" size={fontSizes.listTitle}>
            {product.name}
          </AppText>
          {product.description ? (
            <AppText color={colors.ink2} size={fontSizes.caption} numberOfLines={2}>
              {product.description}
            </AppText>
          ) : null}
          <ProductPrice product={product} />
        </View>
        <View style={styles.rowSide}>
          <ProductPicture product={product} size={ROW_IMAGE} />
          {isCustomizable(product) ? (
            <AppText color={colors.ink2} size={fontSizes.caption}>
              {t('store.customizable')}
            </AppText>
          ) : null}
        </View>
      </PressableScale>
      <View pointerEvents="box-none" style={styles.rowPictureBox}>
        <AddButton product={product} count={actions.countOf(product.id)} onPress={() => actions.add(product)} />
      </View>
    </View>
  );
}

/** A product in a grid (contract §8.4 market and category pages): picture with "+", name, price. */
export function ProductCard({ product, actions, width }: { product: Product; actions: ProductActions; width?: number }) {
  return (
    <View style={width ? { width } : styles.cell}>
      <PressableScale accessibilityRole="button" accessibilityLabel={product.name} onPress={() => actions.open(product)} scaleTo={0.98} style={styles.card}>
        <ProductPicture product={product} />
        <AppText weight="medium" size={fontSizes.body} numberOfLines={2}>
          {product.name}
        </AppText>
        <ProductPrice product={product} />
      </PressableScale>
      <View pointerEvents="box-none" style={styles.cardPictureBox}>
        <AddButton product={product} count={actions.countOf(product.id)} onPress={() => actions.add(product)} />
      </View>
    </View>
  );
}

/** Products three to a row. */
export function ProductGrid({ products, actions }: { products: Product[]; actions: ProductActions }) {
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += 3) rows.push(products.slice(i, i + 3));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0]!.id} style={styles.gridRow}>
          {row.map((p) => (
            <ProductCard key={p.id} product={p} actions={actions} />
          ))}
          {Array.from({ length: 3 - row.length }, (_, i) => (
            <View key={`gap${i}`} style={styles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  picture: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: { width: '100%', aspectRatio: 1 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowText: { flex: 1, gap: spacing.lg, alignItems: 'flex-start' },
  rowSide: { alignItems: 'center', gap: spacing.sm },
  // Over the row's picture: same place and size, the button in its bottom corner.
  rowPictureBox: {
    position: 'absolute',
    top: spacing.lg,
    end: spacing.lg,
    width: ROW_IMAGE,
    height: ROW_IMAGE,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.sm,
  },
  cell: { flex: 1 },
  card: { gap: spacing.xs, alignItems: 'flex-start' },
  // Over the card's square picture.
  cardPictureBox: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    aspectRatio: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.sm,
  },
  grid: { gap: spacing.xl, paddingHorizontal: spacing.lg },
  gridRow: { flexDirection: 'row', gap: spacing.md },
});
