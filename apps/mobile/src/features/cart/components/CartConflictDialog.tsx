import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useT } from '@/core/i18n';

/** [Open] The captures show no store conflict, so use the app's confirmation pattern. */
export function CartConflictDialog({ storeName, cancel, replace }: { storeName?: string; cancel: () => void; replace: () => void }) {
  const t = useT();
  return (
    <ConfirmDialog
      visible={storeName !== undefined}
      tone="primary"
      title={t('cart.conflictTitle')}
      message={t('cart.conflictMessage', { store: storeName ?? '' })}
      confirmLabel={t('cart.replace')}
      onCancel={cancel}
      onConfirm={replace}
    />
  );
}
