import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { colors, radius, spacing } from '@/core/theme';

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Hidden on the first screen, which has nothing to go back to. */
  back?: 'circle' | 'square' | 'grey' | false;
  /** "أهلاً بعودتك": an icon in a soft square above a centred title. */
  icon?: LucideIcon;
  children: ReactNode;
  /** The full-width button pinned at the bottom ("تأكيد", "متابعة"). */
  footer?: ReactNode;
}

/**
 * The frame of Tawsilty's sign-in and sign-up screens ("رقم الهاتف", "رمز التحقق", "التفاصيل
 * الشخصية"): the back button on the start side, a big bold title, a grey line under it, the form,
 * and the button at the bottom. With an icon, the title is centred under it ("أهلاً بعودتك").
 */
export function AuthLayout({ title, subtitle, back = 'circle', icon: Icon, children, footer }: Props) {
  const centred = !!Icon;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.backRow}>{back ? <BackButton variant={back} /> : null}</View>
          {Icon ? (
            <View style={styles.icon}>
              <Icon size={30} color={colors.primary} />
            </View>
          ) : null}
          <AppText accessibilityRole="header" weight="bold" size={centred ? 32 : 30} style={centred && styles.centred}>
            {title}
          </AppText>
          {typeof subtitle === 'string' ? (
            <AppText size={16} color={colors.ink2} style={[styles.subtitle, centred && styles.centred]}>
              {subtitle}
            </AppText>
          ) : (
            subtitle
          )}
          <View style={[styles.form, centred && styles.formLow]}>{children}</View>
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  backRow: { minHeight: 48, alignItems: 'flex-start', marginTop: spacing.md, marginBottom: spacing.xl },
  icon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    borderColor: colors.logoBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  centred: { textAlign: 'center' },
  subtitle: { marginTop: spacing.md },
  form: { marginTop: spacing.xxl, gap: spacing.xl },
  formLow: { marginTop: spacing.xxl + spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
