import type { Category } from '@tawsela/shared';
import { Menu } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';

export const TABS_HEIGHT = 56;

/** The restaurant layout's category tabs (contract §8.4) with ☰, which lists every category. */
export function CategoryTabs({
  categories,
  active,
  onSelect,
  onAll,
}: {
  categories: Pick<Category, 'id' | 'name'>[];
  active: number | undefined;
  onSelect: (id: number) => void;
  onAll: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.row}>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('store.allCategories')} onPress={onAll} hitSlop={8} scaleTo={0.9} style={styles.all}>
        <Menu size={24} color={colors.ink} />
      </PressableScale>
      <View style={styles.divider} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={styles.tabs}>
        {categories.map((c) => {
          const on = c.id === active;
          return (
            <PressableScale
              key={c.id}
              accessibilityRole="tab"
              accessibilityLabel={c.name}
              accessibilityState={{ selected: on }}
              onPress={() => onSelect(c.id)}
              scaleTo={0.97}
              style={[styles.tab, on ? styles.tabOn : null]}
            >
              <AppText weight={on ? 'bold' : 'regular'} size={fontSizes.listTitle} color={on ? colors.ink : colors.ink2}>
                {c.name}
              </AppText>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: TABS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  all: { paddingHorizontal: spacing.lg },
  divider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.line },
  tabs: { paddingHorizontal: spacing.sm },
  tab: { height: TABS_HEIGHT, justifyContent: 'center', paddingHorizontal: spacing.lg, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.ink },
});
