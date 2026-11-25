import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useT } from '@/core/i18n';

export interface CartConflict {
  storeName?: string;
  cancel: () => void;
  replace: () => Promise<boolean>;
}

/** [Open] The captures show no store conflict, so use the app's confirmation pattern. */
export function CartConflictDialog({ storeName, cancel, replace, busy, error }: Omit<CartConflict, 'replace'> & {
  replace: () => void;
  busy: boolean;
  error: string | null;
}) {
  const t = useT();
  return (
    <ConfirmDialog
      visible={storeName !== undefined}
      inline
      tone="primary"
      title={t('cart.conflictTitle')}
      message={t('cart.conflictMessage', { store: storeName ?? '' })}
      confirmLabel={t('cart.replace')}
      confirmDisabled={busy}
      error={error}
      onCancel={cancel}
      onConfirm={replace}
    />
  );
}
