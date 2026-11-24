import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { AppText } from './AppText';
import { Button } from './Button';

/**
 * The server could not be reached at launch, but a session is stored: the app's error line and
 * "إعادة المحاولة" (the pattern of a screen that fails to load) instead of sending the account to
 * sign-in. Tawsilty's own no-connection screen is not captured [Open].
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
      <AppText color={colors.danger} style={styles.center}>
        {t('errors.network')}
      </AppText>
      <Button label={t('common.retry')} variant="soft" loading={busy} onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.bg },
  center: { textAlign: 'center' },
});
