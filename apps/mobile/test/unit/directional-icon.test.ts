import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, ChevronLeft, ChevronRight, LogOut } from 'lucide-react-native';
import { directional } from '@/components/DirectionalIcon';

// The chevrons on "استخدم ووفر" and حسابي's invite card, and some back arrows, showed the wrong way in
// Arabic after moving around the app (2026-11-27), though a fresh start drew them right. An arrow with
// a twin is now drawn as that twin, never flipped, and every icon states its scaleX, so no native view
// can keep an old mirror.
describe('directional', () => {
  it('draws the Arabic icon as it is, stating scaleX 1', () => {
    expect(directional(ChevronLeft, true)).toEqual({ icon: ChevronLeft, transform: [{ scaleX: 1 }] });
    expect(directional(ArrowRight, true)).toEqual({ icon: ArrowRight, transform: [{ scaleX: 1 }] });
  });

  it('draws the mirror twin for English, stating scaleX 1', () => {
    expect(directional(ChevronLeft, false)).toEqual({ icon: ChevronRight, transform: [{ scaleX: 1 }] });
    expect(directional(ChevronRight, false)).toEqual({ icon: ChevronLeft, transform: [{ scaleX: 1 }] });
    expect(directional(ArrowRight, false)).toEqual({ icon: ArrowLeft, transform: [{ scaleX: 1 }] });
    expect(directional(ArrowLeft, false)).toEqual({ icon: ArrowRight, transform: [{ scaleX: 1 }] });
    expect(directional(ArrowUpLeft, false)).toEqual({ icon: ArrowUpRight, transform: [{ scaleX: 1 }] });
  });

  it('mirrors an icon with no twin, and states scaleX 1 in Arabic so a reused view drops an old mirror', () => {
    expect(directional(LogOut, false)).toEqual({ icon: LogOut, transform: [{ scaleX: -1 }] });
    expect(directional(LogOut, true)).toEqual({ icon: LogOut, transform: [{ scaleX: 1 }] });
  });
});
