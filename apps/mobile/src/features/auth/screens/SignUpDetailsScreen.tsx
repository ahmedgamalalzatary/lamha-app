import { AUTH, isValidPassword } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Gift, Mail, Phone, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { LockedField } from '@/components/LockedField';
import { TextField } from '@/components/TextField';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';
import { authApi, homeOf } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';

/**
 * Tawsilty's "التفاصيل الشخصية" (customer/auth/signup-personal-details-invite-code.jpeg). The email
 * is locked like the phone, since the code was sent to it (contract §8.1).
 */
export function SignUpDetailsScreen() {
  const t = useT();
  const { ticket, phone, email } = useLocalSearchParams<{ ticket: string; phone: string; email: string }>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [checked, setChecked] = useState(false);

  const missing = (v: string) => (checked && !v.trim() ? t('common.required') : null);
  const passwordBad = checked && !isValidPassword(password);

  const { run, busy } = useSubmit(async () => {
    const inviteCode = invite.trim().toUpperCase();
    const res = await authApi.signup({
      ticket,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password,
      ...(inviteCode ? { inviteCode } : {}),
    });
    await session.signIn(res);
    router.replace(homeOf(res.user.role));
  });

  const submit = () => {
    setChecked(true);
    if (firstName.trim() && lastName.trim() && isValidPassword(password)) void run();
  };

  return (
    <AuthLayout
     
      title={t('auth.details.title')}
      subtitle={t('auth.details.subtitle')}
      footer={<Button label={t('common.continue')} loading={busy} onPress={submit} />}
    >
      <LockedField icon={Phone} label={t('auth.phone')} value={phone} />
      <LockedField icon={Mail} label={t('auth.email')} value={email} />
      <View style={styles.names}>
        <View style={styles.name}>
          <TextField
            label={t('auth.details.firstName')}
            value={firstName}
            onChangeText={setFirstName}
            maxLength={AUTH.nameMaxLength}
            counter
            autoComplete="given-name"
            error={missing(firstName)}
          />
        </View>
        <View style={styles.name}>
          <TextField
            label={t('auth.details.lastName')}
            value={lastName}
            onChangeText={setLastName}
            maxLength={AUTH.nameMaxLength}
            counter
            autoComplete="family-name"
            error={missing(lastName)}
          />
        </View>
      </View>
      <TextField label={t('auth.password')} value={password} onChangeText={setPassword} secure autoComplete="new-password" />
      <View style={[styles.hint, passwordBad && styles.hintBad]}>
        <ShieldCheck size={18} color={passwordBad ? colors.danger : colors.primary} />
        <AppText size={14} color={passwordBad ? colors.danger : colors.ink2}>
          {t('auth.passwordHint')}
        </AppText>
      </View>
      <View style={styles.invite}>
        <View style={styles.inviteHead}>
          <Gift size={22} color={colors.primary} />
          <AppText weight="bold" size={17}>
            {t('auth.details.inviteTitle')}
          </AppText>
        </View>
        <AppText size={14} color={colors.ink2}>
          {t('auth.details.inviteBody')}
        </AppText>
        <View style={styles.inviteBox}>
          <TextField
            accessibilityLabel={t('auth.details.invitePlaceholder')}
            placeholder={t('auth.details.invitePlaceholder')}
            value={invite}
            onChangeText={setInvite}
            autoCapitalize="characters"
            maxLength={12}
          />
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  names: { flexDirection: 'row', gap: spacing.lg },
  name: { flex: 1 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: -spacing.sm,
  },
  hintBad: { borderColor: colors.danger },
  invite: {
    borderWidth: 1,
    borderColor: colors.primary100,
    backgroundColor: colors.inviteTint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  inviteHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inviteBox: { marginTop: spacing.sm },
});
