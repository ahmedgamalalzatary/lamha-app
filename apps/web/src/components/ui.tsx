'use client';

import { Eye, EyeOff, LoaderCircle, type LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useEffect, useId, useState } from 'react';

/** Tawsilty's primary button (contract §6.3): orange, rounded; faded when disabled. */
export function Button({
  loading,
  tone = 'primary',
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; tone?: 'primary' | 'soft' | 'danger' }) {
  const tones = {
    primary: 'bg-tw text-white hover:bg-tw-700 disabled:bg-tw/45',
    soft: 'bg-tw-50 text-tw-700 hover:bg-tw-100 disabled:opacity-50',
    danger: 'bg-tw-danger text-white hover:opacity-90 disabled:opacity-50',
  };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors ${tones[tone]} ${className}`}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

/** A labelled text field on Tawsilty's grey input fill; a password field has the eye toggle. */
export function TextField({
  label,
  type = 'text',
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & { label: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const secret = type === 'password';
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-tw-ink">
        {label}
      </label>
      <div className="flex items-center rounded-xl bg-tw-input focus-within:ring-2 focus-within:ring-tw/40">
        <input id={id} type={secret && shown ? 'text' : type} className="h-12 w-full bg-transparent px-4 text-sm outline-none placeholder:text-tw-ink-2" {...rest} />
        {secret ? (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            className="grid size-11 shrink-0 place-items-center text-tw-ink-2"
          >
            {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A red line under a form, announced to screen readers. */
export function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-tw-danger">
      {children}
    </p>
  );
}

/** A white card over a dim page. Escape and a click outside close it. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/**
 * Tawsilty's confirm dialog (contract §6.3, the address's "حذف العنوان" look): a bold title, the
 * message, an orange rounded "تأكيد" and a red "إلغاء".
 */
export function ConfirmDialog({
  title,
  message,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="text-sm text-tw-ink-2">{message}</p>
      <div className="flex items-center gap-3">
        <Button loading={busy} onClick={onConfirm} className="flex-1">
          تأكيد
        </Button>
        <button type="button" onClick={onClose} className="h-11 flex-1 rounded-full text-sm font-semibold text-tw-danger">
          إلغاء
        </button>
      </div>
    </Dialog>
  );
}

/** Tawsilty's empty state (contract §6.3): two soft-orange circles, an orange icon, a bold title, a grey line. */
export function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="mb-2 grid size-40 place-items-center rounded-full bg-tw-50">
        <div className="grid size-26 place-items-center rounded-full bg-tw-100">
          <Icon className="size-11 text-tw-700" strokeWidth={1.8} aria-hidden />
        </div>
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      {message ? <p className="text-sm text-tw-ink-2">{message}</p> : null}
    </div>
  );
}
