import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, sizes } from '@/core/theme';
import { DirectionalIcon } from './DirectionalIcon';
import { PressableScale } from './PressableScale';

/**
 * The one back button: the arrow, pointing right (back, in Arabic), on the start side of the header.
 * `round` puts it in a white circle, where it sits among round buttons (the store's bar) or on a photo
 * or the orange header. It used to come in five looks (arrow, chevron, grey circle, squares) and some
 * screens put it on the far side (2026-11-27).
 */
export function BackButton({ variant = 'plain', onPress }: { variant?: 'plain' | 'round'; onPress?: () => void }) {
  const t = useT();
  const back = onPress ?? (() => router.back());
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} hitSlop={8} scaleTo={0.9} style={styles[variant]}>
      <DirectionalIcon icon={ArrowRight} size={24} color={colors.ink} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  plain: { width: sizes.touch, height: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  round: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
