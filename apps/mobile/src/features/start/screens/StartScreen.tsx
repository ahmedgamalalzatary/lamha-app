import { type Href, Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { type TranslationKey, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { ApiStatus } from '@/features/health/components/ApiStatus';

const AREAS: { href: Href; label: TranslationKey }[] = [
  { href: '/customer', label: 'dev.customer' },
  { href: '/partner', label: 'dev.partner' },
  { href: '/driver', label: 'dev.driver' },
  { href: '/admin', label: 'dev.admin' },
];

/**
 * Phase 0's start screen: shows the app reaches the API, and opens each role's (empty) tab bar.
 * Phase 1 replaces it with sign-in, after which the account's role picks the tabs.
 */
export function StartScreen() {
  const t = useT();
  return (
    <SafeAreaView style={styles.screen}>
      <AppText weight="bold" size={32} color={colors.primary}>
        {t('app.name')}
      </AppText>
      <ApiStatus />
      <View style={styles.areas}>
        <AppText weight="semibold" size={fontSizes.listTitle}>
          {t('dev.title')}
        </AppText>
        {AREAS.map((area) => (
          <Link key={area.label} href={area.href} asChild>
            <Pressable accessibilityRole="button" style={styles.button}>
              <AppText weight="semibold" color={colors.bg}>
                {t(area.label)}
              </AppText>
            </Pressable>
          </Link>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, padding: spacing.xl, backgroundColor: colors.bg },
  areas: { alignSelf: 'stretch', gap: spacing.md, alignItems: 'center' },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
});
