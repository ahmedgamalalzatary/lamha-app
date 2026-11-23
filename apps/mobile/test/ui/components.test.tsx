import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { toast, ToastHost } from '@/components/Toast';
import { Package } from 'lucide-react-native';

describe('EmptyState (§6.3)', () => {
  it('shows the bold title and the grey line', async () => {
    await render(<EmptyState icon={Package} title="لا توجد طلبات" message="ابدأ بطلب منتجاتك المفضلة الآن" />);
    expect(screen.getByRole('header', { name: 'لا توجد طلبات' })).toBeTruthy();
    expect(screen.getByText('ابدأ بطلب منتجاتك المفضلة الآن')).toBeTruthy();
  });
});

describe('ConfirmDialog (§6.3)', () => {
  it('confirms with the red action and cancels with إلغاء', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <ConfirmDialog
        visible
        title="حذف المنتج"
        message="هل أنت متأكد؟"
        confirmLabel="حذف"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText('هل أنت متأكد؟')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'حذف' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows nothing when hidden', async () => {
    await render(
      <ConfirmDialog visible={false} title="حذف المنتج" confirmLabel="حذف" onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.queryByText('حذف المنتج')).toBeNull();
  });
});

describe('BottomSheet (§6.3)', () => {
  it('shows its title and content, and closes from the backdrop', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet visible title="رتب حسب" onClose={onClose}>
        <Text>الأقرب</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('رتب حسب')).toBeTruthy();
    expect(screen.getByText('الأقرب')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Toast (§6.3)', () => {
  afterEach(async () => {
    await act(() => toast.clear());
    jest.useRealTimers();
  });

  it('shows the message, then hides it by itself', async () => {
    jest.useFakeTimers();
    await render(<ToastHost />);
    await act(() => toast.show('تم حذف العنوان', 'success'));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('تم حذف العنوان')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(4000));
    expect(screen.queryByText('تم حذف العنوان')).toBeNull();
  });

  it('a new toast replaces the old one', async () => {
    await render(<ToastHost />);
    await act(() => toast.show('من فضلك أدخل الكوبون أولا'));
    await act(() => toast.show('عذراً الخدمة مغلقة الآن', 'error'));
    expect(screen.queryByText('من فضلك أدخل الكوبون أولا')).toBeNull();
    expect(await screen.findByText('عذراً الخدمة مغلقة الآن')).toBeTruthy();
  });
});

describe('Button (§6.3 primary button)', () => {
  it('presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="تأكيد الموقع" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'تأكيد الموقع' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="تأكيد الموقع" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'تأكيد الموقع' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows it is busy while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="حفظ العنوان" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'حفظ العنوان' });
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
