import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { isRTL, useLocale } from '@/core/i18n';

/** Tawsela's reference icons face the Arabic direction. Mirror horizontal arrows for English. */
export function DirectionalIcon({ icon: Icon, ...props }: Omit<LucideProps, 'style'> & { icon: LucideIcon }) {
  const rtl = isRTL(useLocale());
  return <Icon {...props} style={rtl ? undefined : { transform: [{ scaleX: -1 }] }} />;
}
