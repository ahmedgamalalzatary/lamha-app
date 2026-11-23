import { rubberband, shouldDismiss } from '@/core/motion/drag';

describe('shouldDismiss (drag a sheet down to close it)', () => {
  const height = 500;

  it('closes after a long drag down', () => {
    expect(shouldDismiss(300, 0, height)).toBe(true);
  });

  it('springs back after a short slow drag', () => {
    expect(shouldDismiss(50, 0, height)).toBe(false);
  });

  it('closes on a quick flick even from a short drag', () => {
    expect(shouldDismiss(50, 1500, height)).toBe(true);
  });

  it('stays open when the finger was moving back up', () => {
    expect(shouldDismiss(300, -800, height)).toBe(false);
  });
});

describe('rubberband', () => {
  it('follows less than the finger past the edge', () => {
    const moved = rubberband(-100, 500);
    expect(moved).toBeLessThan(0);
    expect(moved).toBeGreaterThan(-100);
  });
});
