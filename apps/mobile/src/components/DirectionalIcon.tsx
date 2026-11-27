import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, ChevronLeft, ChevronRight, type LucideIcon, type LucideProps } from 'lucide-react-native';
import { isRTL, useLocale } from '@/core/i18n';

const TWINS = new Map<LucideIcon, LucideIcon>([
  [ChevronLeft, ChevronRight],
  [ChevronRight, ChevronLeft],
  [ArrowLeft, ArrowRight],
  [ArrowRight, ArrowLeft],
  [ArrowUpLeft, ArrowUpRight],
  [ArrowUpRight, ArrowUpLeft],
]);

/**
 * How to draw an icon drawn for Arabic: as it is in Arabic, as its mirror twin in English. The chevrons
 * on "استخدم ووفر", حسابي's invite card and سلاتي, and some back arrows, pointed the wrong way after
 * moving around the app (2026-11-27), though a fresh start drew them right. So a twin is never
 * flipped, and every icon states its scaleX: no native view can keep an old mirror.
 */
export function directional(icon: LucideIcon, rtl: boolean): { icon: LucideIcon; transform: [{ scaleX: 1 | -1 }] } {
  const twin = TWINS.get(icon);
  if (twin) return { icon: rtl ? icon : twin, transform: [{ scaleX: 1 }] };
  return { icon, transform: [{ scaleX: rtl ? 1 : -1 }] };
}

/** Tawsela's reference icons face the Arabic direction. Horizontal arrows turn round for English. */
export function DirectionalIcon({ icon, ...props }: Omit<LucideProps, 'style'> & { icon: LucideIcon }) {
  const { icon: Icon, transform } = directional(icon, isRTL(useLocale()));
  return <Icon {...props} style={{ transform }} />;
}
