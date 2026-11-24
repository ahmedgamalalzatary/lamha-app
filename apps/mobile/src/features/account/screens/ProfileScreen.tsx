import { type Gender, isValidEmail, normalizeEmail } from '@tawsela/shared';
import { router } from 'expo-router';
import { Camera, ChevronRight, Lock, type LucideIcon, Mail, MapPin, Phone, User, Users } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { toast } from '@/components/Toast';
import { session, useSession } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, fonts, radius, spacing } from '@/core/theme';
import { meApi } from '../api/me';
import { EmailCodeSheet } from '../components/EmailCodeSheet';
import { PhoneChangeSheet } from '../components/PhoneChangeSheet';
import { PhotoSheet } from '../components/PhotoSheet';

/**
 * "الملف الشخصي" (customer/account/profile-edit.png): full name and region locked, email and gender
 * editable; the phone's "تغيير" opens its sheet and the avatar's camera the "اختر صورة" sheet.
 */
export function ProfileScreen() {
  const t = useT();
  const user = useSession((s) => s.user);
  const [email, setEmail] = useState(user?.email ?? '');
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'phone' | 'photo' | null>(null);
  /** The new email waiting for its code (review F01). */
  const [codeFor, setCodeFor] = useState<string | null>(null);

  const save = useSubmit(async ({ email: newEmail, gender: newGender }: { email?: string; gender?: Gender }) => {
    if (newGender) {
      session.setUser(await meApi.update({ gender: newGender }));
      if (!newEmail) toast.show(t('profile.saved'), 'success');
    }
    if (newEmail) setCodeFor((await meApi.sendEmailCode(newEmail)).email);
  });

  if (!user) return null;

  const changes: { email?: string; gender?: Gender } = {};
  if (normalizeEmail(email) !== (user.email ?? '')) changes.email = normalizeEmail(email);
  if (gender && gender !== user.gender) changes.gender = gender;

  const submit = () => {
    if (changes.email !== undefined && !isValidEmail(changes.email)) return setEmailError(t('auth.badEmail'));
    setEmailError(null);
    void save.run(changes);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={12} onPress={() => router.back()}>
          <ChevronRight size={28} color={colors.primary} />
        </Pressable>
        <AppText accessibilityRole="header" weight="bold" size={19} style={styles.headerTitle}>
          {t('profile.title')}
        </AppText>
        <View style={styles.headerSide} />
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.avatar}>
          <View>
            <Avatar size={140} photo={user.avatar} />
            <Pressable accessibilityRole="button" accessibilityLabel={t('profile.changePhoto')} hitSlop={8} onPress={() => setSheet('photo')} style={styles.camera}>
              <Camera size={22} color={colors.bg} />
            </Pressable>
          </View>
        </View>
        <View style={styles.card}>
          <Section icon={User} label={t('profile.fullName')}>
            <Box locked>
              <AppText size={16} color={colors.ink2}>{`${user.firstName} ${user.lastName}`.trim()}</AppText>
            </Box>
          </Section>
          <Section icon={Phone} label={t('auth.phone')}>
            <Box>
              <View style={styles.phoneRow}>
                <AppText size={16}>{user.phone}</AppText>
                <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setSheet('phone')} style={styles.change}>
                  <AppText weight="bold" color={colors.primary}>
                    {t('profile.change')}
                  </AppText>
                </Pressable>
              </View>
            </Box>
          </Section>
          <Section icon={Mail} label={t('auth.email')}>
            <Box>
              <TextInput
                value={email}
                onChangeText={setEmail}
                accessibilityLabel={t('auth.email')}
                placeholder={t('profile.emailPlaceholder')}
                placeholderTextColor={colors.ink2}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </Box>
            {emailError ? (
              <AppText size={12} color={colors.danger}>
                {emailError}
              </AppText>
            ) : null}
          </Section>
          <Section icon={Users} label={t('profile.gender')}>
            <View accessibilityRole="radiogroup" style={styles.genders}>
              {(['male', 'female'] as const).map((g) => {
                const on = gender === g;
                const label = t(g === 'male' ? 'profile.male' : 'profile.female');
                return (
                  <Pressable
                    key={g}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: on }}
                    onPress={() => setGender(g)}
                    style={[styles.gender, on && styles.genderOn]}
                  >
                    <AppText weight="bold" color={on ? colors.primary : '#5B5F6B'}>
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Section>
          <Section icon={MapPin} label={t('profile.region')} last>
            <Box locked>
              <AppText size={16} color={colors.ink2}>
                {user.region ?? '—'}
              </AppText>
            </Box>
          </Section>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t('common.save')} disabled={!Object.keys(changes).length} loading={save.busy} onPress={submit} />
      </View>
      <PhoneChangeSheet visible={sheet === 'phone'} onClose={() => setSheet(null)} />
      <EmailCodeSheet email={codeFor} onClose={() => setCodeFor(null)} />
      <PhotoSheet visible={sheet === 'photo'} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}

function Section({ icon: Icon, label, last, children }: { icon: LucideIcon; label: string; last?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, !last && styles.sectionLine]}>
      <View style={styles.sectionHead}>
        <Icon size={16} color="#5B5F6B" />
        <AppText weight="semibold" size={14} color="#5B5F6B">
          {label}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function Box({ locked, children }: { locked?: boolean; children: ReactNode }) {
  return (
    <View style={styles.box}>
      <View style={styles.boxValue}>{children}</View>
      {locked ? <Lock size={18} color={colors.ink2} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSide: { width: 28 },
  body: { flex: 1, backgroundColor: '#F6F7F9' },
  bodyContent: { paddingBottom: spacing.xl },
  avatar: { alignItems: 'center', paddingVertical: spacing.xl },
  camera: {
    position: 'absolute',
    bottom: 4,
    end: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.bg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  change: { backgroundColor: colors.primary50, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.lg + 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  section: { paddingVertical: spacing.lg + 2, gap: spacing.md },
  sectionLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: radius.md + 2,
    backgroundColor: '#F2F3F7',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  boxValue: { flex: 1 },
  input: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink, textAlign: 'right', paddingVertical: spacing.md },
  genders: { flexDirection: 'row', gap: spacing.lg },
  gender: {
    flex: 1,
    minHeight: 60,
    borderRadius: radius.md + 2,
    backgroundColor: '#F2F3F7',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOn: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
});
