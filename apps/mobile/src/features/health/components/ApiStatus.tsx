import { CircleCheck, CircleX } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';
import { useHealth } from '../hooks/useHealth';

/** Shows whether the app reaches the API (Phase 0's visible result). */
export function ApiStatus() {
  const t = useT();
  const { data, isPending, isError, refetch, isFetching } = useHealth();

  if (isPending) {
    return (
      <View style={styles.row}>
        <ActivityIndicator color={colors.primary} />
        <AppText color={colors.ink2}>{t('health.checking')}</AppText>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.box}>
        <View style={styles.row}>
          <CircleX color={colors.danger} size={20} />
          <AppText weight="medium" color={colors.danger}>
            {t('health.down')}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
          disabled={isFetching}
          onPress={() => refetch()}
          style={styles.retry}
        >
          <AppText weight="semibold" color={colors.bg}>
            {t('common.retry')}
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <CircleCheck color={colors.success} size={20} />
        <AppText weight="medium" color={colors.success}>
          {t('health.ok')}
        </AppText>
      </View>
      <AppText color={colors.ink2}>{t('health.version', { version: data.version })}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  retry: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
});
