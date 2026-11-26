import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { mediaUrl } from '@/core/api/client';
import { useLocale, useT } from '@/core/i18n';
import { colors, radius, shadows, spacing, welcomeTints } from '@/core/theme';
import { useHome } from '@/features/home/api/home';
// The owner's Arabic logo, cut from the lockup (docs/brand). [Open] The English logo is not sent yet.
import LOGO_AR from '../../../../assets/images/logo-ar.png';

/** The soft card colours behind the pictures, as on Tawsilty's welcome screen. */
const TINTS = welcomeTints;
const COLUMNS = 3;
const PER_COLUMN = 4;

/**
 * Tawsilty's first screen (contract §8.1): columns of pictures on soft cards behind a white card
 * with the name (the owner's logo in Arabic), "يمكننا توصيل كلّ ما تتمناه" and "المتابعة باستخدام رقم الهاتف". The pictures are
 * the home tiles' images [Open]: Tawsilty's own are fixed food photos.
 */
export function WelcomeScreen() {
  const t = useT();
  const locale = useLocale();
  const { width } = useWindowDimensions();
  const home = useHome();
  const images = (home.data?.tiles ?? []).map((tile) => mediaUrl(tile.image)).filter((u): u is string => !!u);
  const cardW = (width - spacing.md * (COLUMNS + 1)) / COLUMNS;

  return (
    <View style={styles.screen}>
      <View style={styles.wall} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: COLUMNS }, (_, c) => (
          // The middle column sits lower, as in the capture.
          <View key={c} style={[styles.column, { marginTop: c === 1 ? -cardW * 0.6 : -cardW * 0.15 }]}>
            {Array.from({ length: PER_COLUMN }, (_, r) => {
              const i = c * PER_COLUMN + r;
              const uri = images.length ? images[i % images.length] : undefined;
              return (
                <View key={r} style={[styles.card, { width: cardW, height: cardW * 1.25, backgroundColor: TINTS[i % TINTS.length] }]}>
                  {uri ? <Image source={{ uri }} contentFit="contain" style={styles.picture} transition={200} /> : null}
                </View>
              );
            })}
          </View>
        ))}
        <LinearGradient colors={[colors.bgClear, colors.bg]} locations={[0.45, 0.8]} style={StyleSheet.absoluteFill} />
      </View>
      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <View style={styles.sheet}>
          {locale === 'ar' ? (
            <Image source={LOGO_AR} accessible accessibilityRole="image" accessibilityLabel={t('app.name')} contentFit="contain" style={styles.logo} />
          ) : (
            <AppText weight="bold" size={44} color={colors.primary} style={styles.centred}>
              {t('app.name')}
            </AppText>
          )}
          <AppText weight="semibold" size={22} style={styles.centred}>
            {t('auth.welcome.tagline')}
          </AppText>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('auth.welcome.withPhone')}
            onPress={() => router.push('/sign-in')}
            style={styles.withPhone}
          >
            <AppText weight="medium" size={17}>
              {t('auth.welcome.withPhone')}
            </AppText>
            <Phone size={22} color={colors.ink} />
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  wall: { position: 'absolute', top: 0, start: 0, end: 0, bottom: 0, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, overflow: 'hidden' },
  column: { gap: spacing.md },
  card: { borderRadius: radius.lg + 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  picture: { width: '85%', height: '85%' },
  bottom: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  sheet: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg + 12,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    ...shadows.soft,
  },
  centred: { textAlign: 'center' },
  logo: { alignSelf: 'center', width: 190, aspectRatio: 1030 / 410 },
  withPhone: {
    marginTop: spacing.lg,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.softButtonBorder,
    backgroundColor: colors.softButton,
  },
});
