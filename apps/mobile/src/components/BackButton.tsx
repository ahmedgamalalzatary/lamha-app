import { router } from 'expo-router';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, radius, sizes } from '@/core/theme';
import { DirectionalIcon } from './DirectionalIcon';
import { PressableScale } from './PressableScale';

/**
 * Tawsilty's back buttons: a grey circle with an arrow ("رمز التحقق") or a white outlined square
 * with a chevron ("التفاصيل الشخصية"), a grey square with a chevron (the phone step), or the arrow
 * alone ("تفاصيل الطلب"). The arrow points right: back, in Arabic.
 */
export function BackButton({ variant = 'circle', onPress }: { variant?: 'circle' | 'square' | 'grey' | 'plain'; onPress?: () => void }) {
  const t = useT();
  const back = onPress ?? (() => router.back());
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={back}
      scaleTo={0.9}
      style={styles[variant]}
    >
      {variant === 'circle' || variant === 'plain' ? <DirectionalIcon icon={ArrowRight} size={24} color={colors.ink} /> : <DirectionalIcon icon={ChevronRight} size={24} color={colors.ink} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  circle: { width: sizes.touch, height: sizes.touch, borderRadius: sizes.touch / 2, backgroundColor: colors.iconCircle, alignItems: 'center', justifyContent: 'center' },
  square: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radius.md + 2,
    borderWidth: 1,
    borderColor: colors.boxBorder,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** The phone step and "أهلاً بعودتك": a grey filled square with the chevron. */
  /** "تفاصيل الطلب": the arrow alone. */
  plain: { width: sizes.touch, height: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  grey: {
    width: 52,
    height: 52,
    borderRadius: radius.md + 2,
    backgroundColor: colors.iconCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
