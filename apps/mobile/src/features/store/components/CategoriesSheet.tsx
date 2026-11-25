import type { Category } from '@tawsela/shared';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { PressableScale } from '@/components/PressableScale';
import { colors, fontSizes, spacing } from '@/core/theme';

/** ☰ on the restaurant layout (contract §8.4): every category with its item count. */
export function CategoriesSheet({
  visible,
  title,
  categories,
  active,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  categories: (Pick<Category, 'id' | 'name'> & { count: number })[];
  active: number | undefined;
  onPick: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose} scroll>
      {categories.map((c) => (
        <PressableScale
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={`${c.name} (${c.count})`}
          onPress={() => onPick(c.id)}
          scaleTo={0.99}
          style={styles.row}
        >
          {c.id === active ? <View style={styles.mark} /> : null}
          <AppText weight="bold" size={fontSizes.listTitle}>
            {c.name}
          </AppText>
          <AppText color={colors.ink2} style={styles.count}>
            ({c.count})
          </AppText>
          <DirectionalIcon icon={ChevronLeft} size={20} color={colors.ink2} />
        </PressableScale>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  mark: { position: 'absolute', start: -spacing.lg, top: spacing.md, bottom: spacing.md, width: 4, backgroundColor: colors.ink },
  count: { flex: 1 },
});
