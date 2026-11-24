import { router } from 'expo-router';
import { Bell, ChevronLeft, Heart, LogOut, Trash2, User } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { TextField } from '@/components/TextField';
import { session, useSession } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { meApi } from '../api/me';
import { AccountRow } from '../components/AccountRow';

/**
 * "حسابي" (customer/account/account-top-wallet-points-invite.png and account-app-group-logout-footer.png).
 * Phase 1 has the header, إعدادات حسابي, حذف الحساب (customers) and تسجيل الخروج; the wallet,
 * points, invite card and the other rows arrive with their phases.
 */
export function AccountScreen() {
  const t = useT();
  const user = useSession((s) => s.user);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');

  const signOut = useSubmit(async () => {
    await session.signOut();
    router.replace('/sign-in');
  });

  const remove = useSubmit(async () => {
    await meApi.remove(password);
    setDeleting(false);
    await session.signOutLocally();
    router.replace('/sign-in');
  });

  if (!user) return null;
  const name = `${user.firstName} ${user.lastName}`.trim();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle + 4}>
            {t('account.title')}
          </AppText>
          <View accessible accessibilityLabel={t('account.notifications')} style={styles.bell}>
            <Bell size={22} color={colors.ink} />
          </View>
        </View>

        <PressableScale accessibilityRole="button" onPress={() => router.push('/profile')} scaleTo={0.98} style={styles.profile}>
          <Avatar />
          <View style={styles.profileText}>
            <AppText weight="bold" size={20}>
              {name}
            </AppText>
            <AppText color={colors.ink2}>{t('account.viewProfile')}</AppText>
          </View>
          <ChevronLeft size={22} color={colors.ink2} />
        </PressableScale>

        <AppText weight="semibold" color={colors.ink2} style={styles.group}>
          {t('account.groupAccount')}
        </AppText>
        <AccountRow icon={User} label={t('account.settings')} onPress={() => router.push('/profile')} />
        {user.role === 'customer' ? <AccountRow icon={Heart} label={t('account.favorites')} onPress={() => router.push('/favorites')} /> : null}

        {user.role === 'customer' ? (
          <>
            <AppText weight="semibold" color={colors.ink2} style={styles.group}>
              {t('account.groupApp')}
            </AppText>
            <AccountRow icon={Trash2} label={t('account.delete')} danger onPress={() => setDeleting(true)} />
          </>
        ) : null}

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('account.signOut')}
          disabled={signOut.busy}
          onPress={() => signOut.run()}
          style={styles.signOut}
        >
          <LogOut size={20} color={colors.danger} />
          <AppText weight="bold" size={17} color={colors.danger}>
            {t('account.signOut')}
          </AppText>
        </PressableScale>
      </ScrollView>

      <BottomSheet visible={deleting} title={t('account.delete')} onClose={() => setDeleting(false)}>
        <View style={styles.sheet}>
          <AppText color={colors.ink2}>{t('account.deleteBody')}</AppText>
          <TextField label={t('auth.password')} value={password} onChangeText={setPassword} secure />
          <Button label={t('account.deleteConfirm')} variant="danger" disabled={!password} loading={remove.busy} onPress={() => remove.run()} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg },
  bell: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F2F2F4', alignItems: 'center', justifyContent: 'center' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.lg },
  profileText: { flex: 1, gap: spacing.xs },
  group: { marginTop: spacing.xl, marginBottom: spacing.xs },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.lg,
    backgroundColor: '#FDEDED',
  },
  sheet: { gap: spacing.lg, paddingTop: spacing.sm },
});
