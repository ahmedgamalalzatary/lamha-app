import { Bell } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { session, useSession } from '@/core/auth/session';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { meApi } from '@/features/account/api/me';

/**
 * إعدادات الإشعارات (contract §8.14, customer/account/notification-settings-push-sms.png): the arrow,
 * "حسابي  اعدادات الخدمات والإشعارات", the orange bell tile and "تفعيل الإشعار" with its line. The SMS
 * switch is left out: Tawsela sends no SMS.
 */
export function NotificationSettingsScreen() {
  const t = useT();
  const enabled = useSession((s) => s.user?.notificationsEnabled ?? true);
  const [busy, setBusy] = useState(false);

  async function change(on: boolean) {
    const generation = session.generation();
    setBusy(true);
    try {
      const updated = await meApi.update({ notificationsEnabled: on });
      if (generation === session.generation()) session.setUser(updated);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.back}>
        <BackButton variant="plain" />
      </View>
      <View style={styles.crumbs}>
        <AppText weight="semibold" size={fontSizes.listTitle + 1}>
          {t('account.title')}
        </AppText>
        <AppText accessibilityRole="header" weight="semibold" size={fontSizes.listTitle + 1}>
          {t('notifications.settingsTitle')}
        </AppText>
      </View>
      <View style={styles.tile}>
        <Bell size={64} color={colors.bg} fill={colors.bg} />
      </View>
      <View style={styles.row}>
        <View style={styles.grow}>
          <AppText weight="bold" size={fontSizes.sectionTitle + 1}>
            {t('notifications.enable')}
          </AppText>
          <AppText color={colors.ink2}>{t('notifications.enableHint')}</AppText>
        </View>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={t('notifications.enable')}
          value={enabled}
          disabled={busy}
          trackColor={{ true: colors.primary100, false: colors.line }}
          thumbColor={enabled ? colors.primary : colors.bg}
          onValueChange={(on) => void change(on)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  // The arrow on the reading start, as in the photo (right in Arabic).
  back: { alignItems: 'flex-start', marginTop: spacing.md },
  crumbs: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  tile: {
    alignSelf: 'center',
    width: 136,
    height: 136,
    borderRadius: radius.lg + 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xxl,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  grow: { flex: 1, gap: spacing.xs },
});
