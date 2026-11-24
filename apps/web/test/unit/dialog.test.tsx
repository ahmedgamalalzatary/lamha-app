import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Dialog } from '@/components/ui';

function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        فتح
      </button>
      <button type="button">زر في الخلفية</button>
      {open ? (
        <Dialog title="حذف المنتج" onClose={() => setOpen(false)}>
          <button type="button">تأكيد</button>
          <button type="button" onClick={() => setOpen(false)}>
            إلغاء
          </button>
        </Dialog>
      ) : null}
    </>
  );
}

describe('Dialog keyboard focus', () => {
  it('moves focus in, keeps Tab inside, and gives it back to the opener on close', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole('button', { name: 'فتح' }));
    expect(screen.getByRole('button', { name: 'تأكيد' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'إلغاء' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'تأكيد' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'إلغاء' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'فتح' })).toHaveFocus();
  });
});
