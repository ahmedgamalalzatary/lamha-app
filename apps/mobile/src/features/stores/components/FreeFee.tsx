import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';

/**
 * A delivery fee of 0: Tawsilty's green "مجاني" pill. Its struck-through usual fee beside it comes
 * with the free-delivery offers (Phase 19); a store whose own fee is 0 has none to strike.
 */
export function FreeFee({ size = 14 }: { size?: number }) {
  const t = useT();
  return (
    <View style={styles.pill}>
      <AppText weight="bold" size={size} color={colors.success}>
        {t('stores.free')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: colors.success50, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
