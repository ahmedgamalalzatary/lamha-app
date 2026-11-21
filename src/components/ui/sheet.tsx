"use client";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cx } from "@/lib/format";

export function Sheet({
  open, onOpenChange, title, description, children, footer, className, full,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  full?: boolean;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-ink/45" />
        <Drawer.Content
          dir="rtl"
          className={cx(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[440px] flex-col rounded-t-[22px] bg-sheet outline-none",
            full ? "h-[94dvh]" : "max-h-[92dvh]",
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-rule" aria-hidden />
          {(title || description) ? (
            <div className="flex items-start gap-3 px-5 pb-2 pt-3">
              <div className="min-w-0 flex-1">
                {title ? <Drawer.Title className="text-[19px] font-semibold text-ink">{title}</Drawer.Title> : null}
                {description ? <Drawer.Description className="mt-1 text-[14px] text-ink-2">{description}</Drawer.Description> : null}
              </div>
              <Drawer.Close aria-label="إغلاق" className="tap -me-1 grid size-9 place-items-center rounded-full bg-paper text-ink-2">
                <X className="size-4.5" />
              </Drawer.Close>
            </div>
          ) : (
            <Drawer.Title className="sr-only">نافذة</Drawer.Title>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="pb-safe border-t border-rule bg-sheet px-5 pt-3">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
