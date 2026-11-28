import { fireEvent, render, screen } from '@testing-library/react-native';
import { Package } from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { Rating, formatCount } from '@/components/Rating';
import { ReceiptRow } from '@/components/Receipt';
import { Segmented } from '@/components/Segmented';
import { Stamp } from '@/components/Stamp';
import { Stepper } from '@/components/Stepper';
import { Switch } from '@/components/Switch';
import { TopBar } from '@/components/TopBar';

describe('Stepper', () => {
  it('adds and removes one', async () => {
    const onChange = jest.fn();
    await render(<Stepper qty={2} onChange={onChange} label="شاورما" />);
    expect(screen.getByLabelText('كمية شاورما')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'زوّد' }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    await fireEvent.press(screen.getByRole('button', { name: 'قلّل' }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('turns minus into remove at one, when it can go to zero', async () => {
    const onChange = jest.fn();
    await render(<Stepper qty={1} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'شيل' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('stops at its minimum and maximum', async () => {
    const onChange = jest.fn();
    await render(<Stepper qty={1} min={1} max={1} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'شيل' })).toBeNull();
    expect(screen.getByRole('button', { name: 'قلّل' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'زوّد' })).toBeDisabled();
  });
});

describe('Segmented', () => {
  it('marks the chosen tab and reports a new choice', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented value="week" onChange={onChange} options={[{ value: 'week', label: 'الأسبوع' }, { value: 'month', label: 'الشهر' }]} />,
    );
    expect(screen.getByRole('tab', { name: 'الأسبوع', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'الشهر', selected: false })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'الشهر' }));
    expect(onChange).toHaveBeenCalledWith('month');
  });
});

describe('Switch', () => {
  it('shows its state and flips it', async () => {
    const onChange = jest.fn();
    await render(<Switch value={false} onChange={onChange} label="صوت الإشعار" />);
    const sw = screen.getByRole('switch', { name: 'صوت الإشعار' });
    expect(sw).not.toBeChecked();
    await fireEvent.press(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does nothing while disabled', async () => {
    const onChange = jest.fn();
    await render(<Switch value onChange={onChange} label="الإشعارات" disabled />);
    expect(screen.getByRole('switch', { name: 'الإشعارات' })).toBeChecked();
    await fireEvent.press(screen.getByRole('switch', { name: 'الإشعارات' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Rating', () => {
  it('shows the value with one decimal and the count', async () => {
    await render(<Rating value={4.8} count={2140} />);
    expect(screen.getByText('4.8')).toBeTruthy();
    expect(screen.getByText('(2.1k)')).toBeTruthy();
    expect(screen.getByLabelText('تقييم 4.8 من 5')).toBeTruthy();
  });

  it('shortens counts from a thousand up', () => {
    expect(formatCount(960)).toBe('960');
    expect(formatCount(1000)).toBe('1.0k');
    expect(formatCount(5120)).toBe('5.1k');
  });
});

describe('ReceiptRow', () => {
  it('shows the label, the amount and the struck old amount', async () => {
    await render(<ReceiptRow label="التوصيل" amount={0} struck={15} tone="success" note="عشان طلبك فوق 250" />);
    expect(screen.getByText('التوصيل')).toBeTruthy();
    expect(screen.getByText(/15/)).toBeTruthy();
    expect(screen.getByText('عشان طلبك فوق 250')).toBeTruthy();
  });
});

describe('Stamp', () => {
  it('reads as its label', async () => {
    await render(<Stamp label="اتلغى" tone="danger" />);
    expect(screen.getByLabelText('اتلغى')).toBeTruthy();
  });
});

describe('TopBar', () => {
  it('shows the title and subtitle, and goes back with the back button', async () => {
    const onBack = jest.fn();
    await render(<TopBar title="الفاتورة" subtitle="لمحة ماركت" onBack={onBack} />);
    expect(screen.getByRole('header', { name: 'الفاتورة' })).toBeTruthy();
    expect(screen.getByText('لمحة ماركت')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('can hide the back button', async () => {
    await render(<TopBar title="حسابي" back={false} />);
    expect(screen.queryByRole('button', { name: 'رجوع' })).toBeNull();
  });
});

describe('EmptyState with an action', () => {
  it('shows the action under the text', async () => {
    const onPress = jest.fn();
    await render(<EmptyState icon={Package} title="فاتورتك لسه فاضية" message="ضيف أكل" action={{ label: 'اتفرج على المحلات', onPress }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'اتفرج على المحلات' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
