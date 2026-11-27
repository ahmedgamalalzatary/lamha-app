import { isValidPassword } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Shield } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';
import { authApi, homeOf } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';

/** Tawsilty's "كلمة مرور الحساب" after the emailed code: the password twice; it signs the customer in. */
export function ResetPasswordScreen() {
  const t = useT();
  const { ticket } = useLocalSearchParams<{ ticket: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [checked, setChecked] = useState(false);
  const bad = checked && !isValidPassword(password);
  const mismatch = checked && isValidPassword(password) && confirm !== password;

  const { run, busy } = useSubmit(async () => {
    const res = await authApi.resetPassword(ticket, password);
    await session.signIn(res);
    router.replace(homeOf(res.user.role));
  });

  const submit = () => {
    setChecked(true);
    if (isValidPassword(password) && confirm === password) void run();
  };

  return (
    <AuthLayout
     
      title={t('auth.reset.title')}
      subtitle={t('auth.reset.subtitle')}
      footer={<Button label={t('common.save')} disabled={!password || !confirm} loading={busy} onPress={submit} style={styles.save} />}
    >
      <View style={styles.group}>
        <TextField
          label={t('auth.password')}
          labelAbove
          icon={Lock}
          placeholder={t('auth.signIn.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="new-password"
        />
        <View style={[styles.hint, bad && styles.hintBad]}>
          <Shield size={18} color={bad ? colors.danger : colors.primary} />
          <AppText size={14} color={bad ? colors.danger : colors.ink2}>
            {t('auth.passwordHint')}
          </AppText>
        </View>
      </View>
      <TextField
        label={t('auth.reset.confirm')}
        labelAbove
        icon={Lock}
        placeholder={t('auth.reset.confirm')}
        value={confirm}
        onChangeText={setConfirm}
        secure
        autoComplete="new-password"
        error={mismatch ? t('auth.reset.mismatch') : null}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  hintBad: { borderColor: colors.danger },
  save: { minHeight: 58 },
});
