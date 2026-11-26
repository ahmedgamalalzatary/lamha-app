import { render, screen } from '@testing-library/react';
import type { WeekSchedule } from '@tawsela/shared';
import { describe, expect, it } from 'vitest';
import { isWeekReady, WeekEditor } from '@/features/drivers/components/WeekEditor';

const week = (sun: [string, string] | null, mon: [string, string] | null): WeekSchedule =>
  [sun, mon, null, null, null, null, null].map((d) => (d ? { start: d[0], end: d[1] } : null));

describe('WeekEditor (contract §10)', () => {
  it('warns of a shift past midnight that runs into the next day\'s, and is not ready to save', () => {
    const overlapping = week(['18:00', '02:00'], ['01:00', '09:00']);
    render(<WeekEditor week={overlapping} onChange={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('تتداخل مع نوبة اليوم التالي');
    expect(isWeekReady(overlapping)).toBe(false);
  });

  it('says nothing when the next day starts as the shift ends', () => {
    const fine = week(['18:00', '02:00'], ['02:00', '09:00']);
    render(<WeekEditor week={fine} onChange={() => undefined} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(isWeekReady(fine)).toBe(true);
  });
});
