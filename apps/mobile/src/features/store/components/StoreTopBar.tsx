import { router } from 'expo-router';
import { ChevronRight, Heart, Search } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors, fontSizes, sizes, spacing } from '@/core/theme';

export const BAR_HEIGHT = 64;

interface Props {
  title: string;
  /** White with the title once the cover has scrolled away (contract §8.4 restaurant-menu-list). */
  solid: boolean;
  favorite?: { on: boolean; busy: boolean; onPress: () => void };
  onSearch?: () => void;
  /** Under the bar while it is solid: the restaurant layout's category tabs. */
  children?: ReactNode;
}

/** Over the store page's cover: back, search and the heart; solid with the store name after scrolling. */
export function StoreTopBar({ title, solid, favorite, onSearch, children }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingTop: insets.top }, solid ? styles.solid : null]}>
      <View pointerEvents="box-none" style={styles.bar}>
        <Round label={t('common.back')} onPress={() => router.back()}>
          <DirectionalIcon icon={ChevronRight} size={26} color={colors.ink} />
        </Round>
        <View style={styles.title} accessibilityElementsHidden={!solid} importantForAccessibility={solid ? 'auto' : 'no-hide-descendants'}>
          {solid ? (
            <AppText weight="semibold" size={fontSizes.listTitle} numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
        </View>
        {onSearch ? (
          <Round label={t('store.search')} onPress={onSearch}>
            <Search size={22} color={colors.ink} />
          </Round>
        ) : null}
        {favorite ? (
          <Round label={t(favorite.on ? 'store.unfavorite' : 'store.favorite')} onPress={favorite.onPress} disabled={favorite.busy}>
            <Heart size={22} color={favorite.on ? colors.danger : colors.ink} fill={favorite.on ? colors.danger : 'transparent'} />
          </Round>
        ) : null}
      </View>
      {solid ? children : null}
    </View>
  );
}

function Round({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} scaleTo={0.9} style={styles.round}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, start: 0, end: 0 },
  solid: { backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  bar: { height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  title: { flex: 1, alignItems: 'center' },
  round: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
