import { router } from 'expo-router';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, radius } from '@/core/theme';
import { PressableScale } from './PressableScale';

/**
 * Tawsilty's back buttons: a grey circle with an arrow ("رمز التحقق") or a white outlined square
 * with a chevron ("التفاصيل الشخصية"), or a grey square with a chevron (the phone step). The arrow
 * points right: back, in Arabic.
 */
export function BackButton({ variant = 'circle', onPress }: { variant?: 'circle' | 'square' | 'grey'; onPress?: () => void }) {
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
      {variant === 'circle' ? <ArrowRight size={24} color={colors.ink} /> : <ChevronRight size={24} color={colors.ink} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  circle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F2F2F4', alignItems: 'center', justifyContent: 'center' },
  square: {
    width: 48,
    height: 48,
    borderRadius: radius.md + 2,
    borderWidth: 1,
    borderColor: '#E3E4E8',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** The phone step and "أهلاً بعودتك": a grey filled square with the chevron. */
  grey: {
    width: 52,
    height: 52,
    borderRadius: radius.md + 2,
    backgroundColor: '#F2F2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
