import { act, render, screen } from '@testing-library/react-native';
import { RotatingSearch } from '@/features/home/components/RotatingSearch';

describe('rotating search placeholder (contract §8.2)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('cycles "ابحث عن" through the words and starts over', async () => {
    await render(<RotatingSearch words={['بيتزا', 'المطاعم']} />);
    expect(screen.getByText('بيتزا')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText('المطاعم')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText('بيتزا')).toBeTruthy();
    expect(screen.getByText(/ابحث عن/)).toBeTruthy();
  });
});
