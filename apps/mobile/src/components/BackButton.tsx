import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, shadows, sizes } from '@/core/theme';
import { DirectionalIcon } from './DirectionalIcon';
import { PressableScale } from './PressableScale';

/**
 * The one back button (lamha's): a chevron pointing right (back, in Arabic) in a 40pt round hit area,
 * on the start side of the header. `round` puts it in a white circle for photos and covers (the store's
 * bar); `onDark` draws it white on the pen header.
 */
export function BackButton({ variant = 'plain', onPress, onDark }: { variant?: 'plain' | 'round'; onPress?: () => void; onDark?: boolean }) {
  const t = useT();
  const back = onPress ?? (() => router.back());
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} hitSlop={8} scaleTo={0.9} style={styles[variant]}>
      <DirectionalIcon icon={ChevronRight} size={24} color={onDark && variant === 'plain' ? colors.sheet : colors.ink} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  plain: { width: sizes.icon, height: sizes.icon, borderRadius: sizes.icon / 2, alignItems: 'center', justifyContent: 'center' },
  round: {
    width: sizes.icon,
    height: sizes.icon,
    borderRadius: sizes.icon / 2,
    backgroundColor: colors.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sheet,
  },
});
