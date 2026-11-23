import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { colors, spacing } from '@/core/theme';

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Hidden on the first screen, which has nothing to go back to. */
  back?: 'circle' | 'square' | false;
  children: ReactNode;
  /** The full-width button pinned at the bottom ("تأكيد", "متابعة"). */
  footer: ReactNode;
}

/**
 * The frame of Tawsilty's sign-up screens ("رمز التحقق", "التفاصيل الشخصية"): the back button on
 * the start side, a big bold title, a grey line under it, the form, and the button at the bottom.
 */
export function AuthLayout({ title, subtitle, back = 'circle', children, footer }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.backRow}>{back ? <BackButton variant={back} /> : null}</View>
          <AppText accessibilityRole="header" weight="bold" size={30}>
            {title}
          </AppText>
          {typeof subtitle === 'string' ? (
            <AppText size={16} color={colors.ink2} style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : (
            subtitle
          )}
          <View style={styles.form}>{children}</View>
        </ScrollView>
        <View style={styles.footer}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  backRow: { minHeight: 48, alignItems: 'flex-start', marginTop: spacing.md, marginBottom: spacing.xl },
  subtitle: { marginTop: spacing.md },
  form: { marginTop: spacing.xxl, gap: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
