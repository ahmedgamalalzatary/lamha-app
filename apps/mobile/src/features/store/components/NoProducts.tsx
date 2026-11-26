import { Archive } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useT } from '@/core/i18n';
import { colors, radius, shadows, spacing } from '@/core/theme';

/** Tawsilty's store with nothing on its menu: a white card with a box icon and "لا توجد منتجات حاليا". */
export function NoProducts() {
  const t = useT();
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Archive size={52} color={colors.ink2} strokeWidth={1.6} />
        <AppText weight="semibold" size={19} style={styles.center}>
          {t('store.empty')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 120 },
  card: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xxl + spacing.md,
    paddingVertical: spacing.xxl,
    borderRadius: radius.lg + 12,
    backgroundColor: colors.bg,
    ...shadows.soft,
  },
  center: { textAlign: 'center' },
});
