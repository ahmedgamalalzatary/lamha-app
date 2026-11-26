import { formatMoney } from '@tawsela/shared';
import { router } from 'expo-router';
import { Bell, BellRing, ChevronLeft, Clock, Heart, Languages, Lightbulb, LogOut, MapPin, ReceiptText, Share2, Star, TriangleAlert, Trash2, User, Wallet } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
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
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { AddressesSheet } from '@/features/addresses/components/AddressesSheet';
import { meApi } from '../api/me';
import { AccountRow } from '../components/AccountRow';
import { usePartnerOrderCounts } from '@/features/partner/api';
import { ComplaintTypeMenu, SupportRows } from '@/features/support/SupportRows';
import { useNotifications } from '@/features/notifications/api';
import { useWallet } from '@/features/wallet/api';
import { usePoints } from '@/features/points/api';
import { useDriverMoney, useDriverPoints } from '@/features/driver/api';
import { AccountInviteCard } from '@/features/invite/AccountInviteCard';

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
 * محفظتي and نقاطي (customer/account/account-top-wallet-points-invite.png): two tiles, each with its
 * icon, label and balance, opening حركة المحفظة and نقاطي.
 */
function MoneyTiles() {
  const t = useT();
  const locale = useLocale();
  const wallet = useWallet();
  const points = usePoints();
  return (
    <View style={styles.tiles}>
      <Tile label={t('wallet.tile')} value={wallet.data ? formatMoney(wallet.data.balance, locale) : ''} onPress={() => router.push('/wallet')}>
        <Wallet size={22} color={colors.blue} />
      </Tile>
      <Tile label={t('points.title')} value={points.data ? String(points.data.balance) : ''} onPress={() => router.push('/points')}>
        <View style={styles.starCircle}>
          <Star size={13} color={colors.bg} fill={colors.bg} />
        </View>
      </Tile>
    </View>
  );
}

/** The delivery man's فواتيري (his net earnings, in green) and نقاطي (speed points not yet paid out). */
function DriverTiles() {
  const t = useT();
  const locale = useLocale();
  const money = useDriverMoney();
  const points = useDriverPoints();
  return (
    <View style={styles.tiles}>
      <Tile
        label={t('driver.money')}
        value={money.data ? formatMoney(money.data.net, locale) : ''}
        valueColor={colors.success}
        onPress={() => router.push('/driver-money')}
      >
        <Wallet size={22} color={colors.blue} />
      </Tile>
      <Tile label={t('points.title')} value={points.data ? String(points.data.balance) : ''} onPress={() => router.push('/driver-points')}>
        <View style={styles.starCircle}>
          <Star size={13} color={colors.bg} fill={colors.bg} />
        </View>
      </Tile>
    </View>
  );
}

/**
 * العمل and الدعم والمساعدة of the delivery man, as in the photos: no "التواصل معنا"; تقديم شكوى asks
 * "نوع الشكوى" first, and طلب سابق opens his طلباتى, whose cards each have تقديم شكوى.
 */
function DriverRows() {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const ticket = (type: 'complaint' | 'suggestion') => router.push({ pathname: '/driver-support/[type]', params: { type } });
  const go = (to: () => void) => {
    setMenu(false);
    to();
  };
  return (
    <>
      <AppText weight="semibold" color={colors.ink2} style={styles.group}>
        {t('driver.groupWork')}
      </AppText>
      <AccountRow icon={Clock} label={t('driver.myShifts')} onPress={() => router.push('/driver-shifts')} />
      <AccountRow icon={ReceiptText} label={t('driver.historyRow')} onPress={() => router.push('/driver-history')} />
      <AppText weight="semibold" color={colors.ink2} style={styles.group}>
        {t('support.group')}
      </AppText>
      <AccountRow icon={Lightbulb} label={t('support.suggest')} onPress={() => ticket('suggestion')} />
      <AccountRow icon={TriangleAlert} label={t('support.complain')} onPress={() => setMenu(true)} />
      <ComplaintTypeMenu
        visible={menu}
        onClose={() => setMenu(false)}
        onPastOrder={() => go(() => router.push('/driver-history'))}
        onGeneral={() => go(() => ticket('complaint'))}
      />
    </>
  );
}

function Tile({ label, value, valueColor, onPress, children }: { label: string; value: string; valueColor?: string; onPress: () => void; children: ReactNode }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${label} ${value}`.trim()} onPress={onPress} scaleTo={0.98} style={styles.tile}>
      <View style={styles.tileTop}>
        {children}
        <AppText weight="semibold" size={fontSizes.listTitle + 1}>
          {label}
        </AppText>
      </View>
      <AppText weight="bold" size={fontSizes.listTitle + 3} color={valueColor}>
        {value}
      </AppText>
    </PressableScale>
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
  const unread = useNotifications().data?.unread ?? 0;

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
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={unread ? t('notifications.bellUnread', { count: unread }) : t('account.notifications')}
            onPress={() => router.push('/notifications')}
            scaleTo={0.9}
            style={styles.bell}
          >
            <Bell size={22} color={colors.ink} />
            {unread ? <View style={styles.bellDot} /> : null}
          </PressableScale>
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

        {user.role === 'customer' ? (
          <>
            <MoneyTiles />
            <AccountInviteCard />
          </>
        ) : null}

        {user.role === 'customer' ? <SupportRows /> : null}

        {/* driver/driver-account-invoices-points-shifts-history.jpg: the tiles, العمل, الدعم والمساعدة, then الحساب. */}
        {user.role === 'driver' ? (
          <>
            <DriverTiles />
            <DriverRows />
          </>
        ) : null}

        <AppText weight="semibold" color={colors.ink2} style={styles.group}>
          {t('account.groupAccount')}
        </AppText>
        <AccountRow icon={User} label={t('account.settings')} onPress={() => router.push('/profile')} />
        <AccountRow icon={BellRing} label={t('notifications.settingsRow')} onPress={() => router.push('/notification-settings')} />
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
            {/* customer/account/account-app-group-share-app.png. [Open] Tawsilty's shared text is not captured. */}
            <AccountRow icon={Share2} label={t('account.shareApp')} onPress={() => void Share.share({ message: t('account.shareAppMessage') })} />
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
  bell: { width: sizes.touch, height: sizes.touch, borderRadius: sizes.touch / 2, backgroundColor: colors.iconCircle, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 10, end: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger },
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
    backgroundColor: colors.danger50,
  },
  sheet: { gap: spacing.lg, paddingTop: spacing.sm },
  tiles: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  tile: { flex: 1, gap: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg },
  starCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
