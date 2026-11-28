import { Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useReduceMotion } from '@/core/hooks/useReduceMotion';
import { useT } from '@/core/i18n';
import { colors, radius, shadows, spacing } from '@/core/theme';

const EVERY_MS = 2200;

/**
 * The home search box (contract §8.2, lamha's): a white box with a pale pen icon tile and "ابحث عن <word>",
 * the word changing every couple of seconds. It opens the search screen (§8.13).
 */
export function RotatingSearch({ words, onPress }: { words: string[]; onPress?: () => void }) {
  const t = useT();
  const reduced = useReduceMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), EVERY_MS);
    return () => clearInterval(id);
  }, [words.length]);

  const word = words[index % words.length] ?? '';
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={t('search.label')} onPress={onPress} style={styles.box}>
      <View style={styles.icon}>
        <Search size={20} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <AppText color={colors.ink3} size={15}>
          {t('home.searchFor')}
        </AppText>
        <Animated.View key={word} entering={reduced ? undefined : FadeInDown.duration(220)} style={styles.wordBox}>
          <AppText weight="semibold" size={15} numberOfLines={1}>
            {word}
          </AppText>
        </Animated.View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.sheet,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    height: 48,
    ...shadows.sheet,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, overflow: 'hidden' },
  wordBox: { flexShrink: 1 },
});
