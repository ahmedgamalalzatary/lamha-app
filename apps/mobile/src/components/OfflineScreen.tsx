import { RotateCw, WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { AppText } from './AppText';
import { Button } from './Button';

/**
 * Tawsilty's no-connection screen (contract §8.1): the crossed Wi-Fi in a soft orange circle,
 * "لا يوجد اتصال بالإنترنت", "تحقق من اتصالك وحاول مجدداً" and "إعادة المحاولة". Shown when the
 * server cannot be reached at launch, instead of sending a stored session to sign-in.
 */
export function OfflineScreen({ onRetry }: { onRetry: () => Promise<void> }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.screen}>
      <View style={styles.circle}>
        <WifiOff size={44} color={colors.primary400} strokeWidth={2.5} />
      </View>
      <AppText weight="bold" size={22} style={styles.center}>
        {t('offline.title')}
      </AppText>
      <AppText size={16} color={colors.ink2} style={[styles.center, styles.body]}>
        {t('offline.body')}
      </AppText>
      <Button label={t('common.retry')} icon={RotateCw} loading={busy} onPress={() => void retry()} style={styles.retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, backgroundColor: colors.bg },
  circle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  center: { textAlign: 'center' },
  body: { marginTop: spacing.lg },
  retry: { alignSelf: 'stretch', marginTop: spacing.xxl, minHeight: 56 },
});
