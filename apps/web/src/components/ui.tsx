'use client';

import { Eye, EyeOff, LoaderCircle, type LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';

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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A white card over a dim page. Escape and a click outside close it. Focus moves into it (unless a
 * field there already took it with autoFocus), Tab and Shift+Tab stay inside, and closing gives
 * focus back to whatever opened it.
 */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const box = card.current;
    if (box && !box.contains(document.activeElement)) (box.querySelector<HTMLElement>(FOCUSABLE) ?? box).focus();
    return () => opener?.focus();
  }, []);
  const trapTab = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !card.current) return;
    const items = [...card.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={card} tabIndex={-1} onKeyDown={trapTab} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
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

/** A square icon button with its name for screen readers and as a tooltip. */
export function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-lg text-tw-ink-2 hover:bg-tw-50 hover:text-tw disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/** An on/off switch (orange when on), announced as a switch with its label. */
export function Switch({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm font-medium">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-tw' : 'bg-tw-line'}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? 'start-5.5' : 'start-0.5'}`} />
      </button>
    </label>
  );
}

/** A labelled select on the grey input fill. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-tw-ink">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="h-12 rounded-xl bg-tw-input px-4 text-sm outline-none focus:ring-2 focus:ring-tw/40">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Tawsilty's admin table (contract §11): an orange header row, rows on thin lines. */
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-tw-line">
      <table className="w-full text-start text-sm">
        <thead className="bg-tw text-white">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-start font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A small rounded status label: green, red or grey. */
export function Pill({ tone, children }: { tone: 'ok' | 'danger' | 'muted'; children: ReactNode }) {
  const tones = { ok: 'bg-tw-ok-50 text-tw-ok', danger: 'bg-tw-danger/10 text-tw-danger', muted: 'bg-tw-input text-tw-ink-2' };
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/** The loading block, and the error line with a retry, every list page shows. */
export function LoadState({ error, onRetry }: { error?: string; onRetry: () => void }) {
  if (!error) return <div className="h-48 animate-pulse rounded-xl bg-tw-surface" />;
  return (
    <div className="flex items-center gap-4">
      <p className="font-medium text-tw-danger">{error}</p>
      <Button tone="soft" onClick={onRetry}>
        إعادة المحاولة
      </Button>
    </div>
  );
}

/** A dialog's حفظ (disabled until ready) and إلغاء. */
export function DialogActions({ ready, busy, onSave, onClose }: { ready: boolean; busy: boolean; onSave: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button disabled={!ready} loading={busy} onClick={onSave} className="flex-1">
        حفظ
      </Button>
      <button type="button" onClick={onClose} className="h-11 flex-1 rounded-full text-sm font-semibold text-tw-ink-2">
        إلغاء
      </button>
    </div>
  );
}
