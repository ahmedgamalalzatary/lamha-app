import { Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useReduceMotion } from '@/core/hooks/useReduceMotion';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

const EVERY_MS = 3000;

/**
 * The home search box (contract §8.2): "ابحث عن <word>", the word changing every few seconds.
 * It opens the search screen (§8.13).
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
        <AppText color={colors.ink2} size={fontSizes.listTitle}>
          {t('home.searchFor')}
        </AppText>
        <Animated.View key={word} entering={reduced ? undefined : FadeInDown.duration(220)} style={styles.wordBox}>
          <AppText weight="bold" size={fontSizes.listTitle} numberOfLines={1}>
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
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    height: 60,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, overflow: 'hidden' },
  wordBox: { flexShrink: 1 },
});
