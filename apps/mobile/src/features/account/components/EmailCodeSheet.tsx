import { OTP } from '@tawsela/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { OtpInput } from '@/components/OtpInput';
import { toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { spacing, colors } from '@/core/theme';
import { meApi } from '../api/me';

/**
 * The code step for a new email (review F01): the code went to the new address, and the email moves
 * only once it is typed. [Open] Not captured from Tawsilty, which saves the email at once; it uses
 * the "رمز التحقق" boxes of the phone-change sheet.
 */
export function EmailCodeSheet({ email, onClose }: { email: string | null; onClose: () => void }) {
  const t = useT();
  const [code, setCode] = useState('');

  const close = () => {
    setCode('');
    onClose();
  };

  const confirm = useSubmit(async () => {
    if (!email) return;
    session.setUser(await meApi.changeEmail(email, code));
    toast.show(t('profile.emailChanged'), 'success');
    close();
  });

  return (
    <BottomSheet visible={email !== null} onClose={close}>
      <View style={styles.body}>
        <AppText weight="bold" size={26}>
          {t('auth.verify.title')}
        </AppText>
        <View style={styles.sentTo}>
          <AppText size={15} color={colors.ink2}>
            {t('auth.verify.sentTo')}
          </AppText>
          <AppText weight="semibold" size={15}>
            {email}
          </AppText>
        </View>
        <OtpInput value={code} onChange={setCode} label={t('auth.verify.code')} />
        <Button
          label={t('auth.verify.submit')}
          disabled={code.length < OTP.length}
          loading={confirm.busy}
          onPress={() => void confirm.run()}
          style={styles.button}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.lg, paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  button: { minHeight: 58, marginTop: spacing.md },
  sentTo: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
