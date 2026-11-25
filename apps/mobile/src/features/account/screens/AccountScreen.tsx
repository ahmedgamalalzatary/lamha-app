import { router } from 'expo-router';
import { Bell, ChevronLeft, Heart, Languages, LogOut, MapPin, ReceiptText, Trash2, User } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { TextField } from '@/components/TextField';
import { session, useSession } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useLocale, useT } from '@/core/i18n';
import { localePreference } from '@/core/i18n/locale';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { AddressesSheet } from '@/features/addresses/components/AddressesSheet';
import { meApi } from '../api/me';
import { AccountRow } from '../components/AccountRow';
import { usePartnerOrderCounts } from '@/features/partner/api';

/** [Client] A partner's "الطلبات اللي اتعملت": the orders the store completed (§9), opening طلباتى. */
function OrdersMadeRow() {
  const t = useT();
  const counts = usePartnerOrderCounts();
  return (
    <AccountRow
      icon={ReceiptText}
      label={t('partner.ordersMade')}
      value={counts.data ? String(counts.data.delivered) : undefined}
      onPress={() => router.push('/partner/orders')}
    />
  );
}

/**
 * "حسابي" (customer/account/account-top-wallet-points-invite.png and account-app-group-logout-footer.png).
 * Phase 1 has the header, إعدادات حسابي, حذف الحساب (customers) and تسجيل الخروج; the wallet,
 * points, invite card and the other rows arrive with their phases.
 */
export function AccountScreen() {
  const t = useT();
  const nextLocale = useLocale() === 'ar' ? 'en' : 'ar';
  const user = useSession((s) => s.user);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmOut, setConfirmOut] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [confirmLanguage, setConfirmLanguage] = useState(false);

  const changeLanguage = useSubmit(async () => {
    const generation = session.generation();
    const updated = await meApi.update({ locale: nextLocale });
    if (generation !== session.generation()) return;
    session.setUser(updated);
    await localePreference.save(updated.locale, () => generation === session.generation());
  });

  const signOut = useSubmit(async () => {
    await session.signOut();
    router.replace('/welcome');
  });

  const remove = useSubmit(async () => {
    await meApi.remove(password);
    setDeleting(false);
    await session.signOutLocally();
    router.replace('/welcome');
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
          <Avatar photo={user.avatar} />
          <View style={styles.profileText}>
            <AppText weight="bold" size={20}>
              {name}
            </AppText>
            <AppText color={colors.ink2}>{t('account.viewProfile')}</AppText>
          </View>
          <DirectionalIcon icon={ChevronLeft} size={22} color={colors.ink2} />
        </PressableScale>

        <AppText weight="semibold" color={colors.ink2} style={styles.group}>
          {t('account.groupAccount')}
        </AppText>
        <AccountRow icon={User} label={t('account.settings')} onPress={() => router.push('/profile')} />
        <AccountRow icon={Languages} label={t('account.language')} disabled={changeLanguage.busy} onPress={() => setConfirmLanguage(true)} />
        {user.role === 'customer' ? (
          <>
            <AccountRow icon={Heart} label={t('account.favorites')} onPress={() => router.push('/favorites')} />
            <AccountRow icon={MapPin} label={t('account.addresses')} onPress={() => setAddressesOpen(true)} />
            <AddressesSheet visible={addressesOpen} onClose={() => setAddressesOpen(false)} />
          </>
        ) : null}

        {user.role === 'partner' ? <OrdersMadeRow /> : null}

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
          onPress={() => setConfirmOut(true)}
          style={styles.signOut}
        >
          <DirectionalIcon icon={LogOut} size={20} color={colors.danger} />
          <AppText weight="bold" size={17} color={colors.danger}>
            {t('account.signOut')}
          </AppText>
        </PressableScale>
      </ScrollView>

      <ConfirmDialog
        visible={confirmLanguage}
        tone="primary"
        title={t('account.language')}
        message={t('account.languageRestart')}
        confirmLabel={nextLocale === 'en' ? 'English' : 'العربية'}
        onConfirm={() => {
          setConfirmLanguage(false);
          void changeLanguage.run();
        }}
        onCancel={() => setConfirmLanguage(false)}
      />

      <ConfirmDialog
        visible={confirmOut}
        tone="outline"
        title={t('account.signOutConfirm')}
        confirmLabel={t('common.confirm')}
        onConfirm={() => {
          setConfirmOut(false);
          void signOut.run();
        }}
        onCancel={() => setConfirmOut(false)}
      />

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
