import { isEgyptianMobile, normalizePhone, OTP } from '@tawsela/shared';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { OtpInput } from '@/components/OtpInput';
import { toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT, useTextStart } from '@/core/i18n';
import { colors, fonts, radius, spacing } from '@/core/theme';
import { meApi } from '../api/me';

/**
 * Tawsilty's "تغيير رقم الهاتف" sheet (profile-change-phone-sheet): the new number and "تأكيد رقم
 * الهاتف". The code goes to the account's email, not by SMS (contract §8.1), so the line under the
 * title says so. The code step after it is not captured: it uses the "رمز التحقق" boxes [Open].
 */
export function PhoneChangeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const textAlign = useTextStart();
  const t = useT();
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPhone('');
    setSentTo(null);
    setCode('');
    setError(null);
    onClose();
  };

  const send = useSubmit(async (p: string) => setSentTo((await meApi.sendPhoneCode(p)).email));
  const confirm = useSubmit(async () => {
    session.setUser(await meApi.changePhone(normalizePhone(phone), code));
    toast.show(t('profile.phoneChanged'), 'success');
    close();
  });

  const submitPhone = () => {
    if (!isEgyptianMobile(phone)) return setError(t('auth.badPhone'));
    setError(null);
    void send.run(normalizePhone(phone));
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.body}>
        <AppText weight="bold" size={26}>
          {t('profile.changePhone')}
        </AppText>
        {sentTo === null ? (
          <>
            <AppText size={15} color={colors.ink2}>
              {t('profile.changePhoneBody')}
            </AppText>
            <View>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                accessibilityLabel={t('profile.newPhone')}
                placeholder={t('profile.newPhone')}
                placeholderTextColor={colors.ink2}
                keyboardType="phone-pad"
                maxLength={14}
                autoFocus
                style={[styles.input, { textAlign }, !!error && styles.invalid]}
              />
              {error ? (
                <AppText size={12} color={colors.danger} style={styles.error}>
                  {error}
                </AppText>
              ) : null}
            </View>
            <Button label={t('profile.confirmPhone')} disabled={!phone} loading={send.busy} onPress={submitPhone} style={styles.button} />
          </>
        ) : (
          <>
            <View style={styles.sentTo}>
              <AppText size={15} color={colors.ink2}>
                {t('auth.verify.sentTo')}
              </AppText>
              <AppText weight="semibold" size={15}>
                {sentTo}
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
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.lg, paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  input: {
    minHeight: 60,
    borderRadius: radius.lg,
    backgroundColor: '#F4F6FA',
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  invalid: { borderColor: colors.danger },
  error: { marginTop: spacing.xs },
  button: { minHeight: 58, marginTop: spacing.md },
  sentTo: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
