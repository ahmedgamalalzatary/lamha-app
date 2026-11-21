import Link from "next/link";
import { cx } from "@/lib/format";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ink" | "outline";
type Size = "sm" | "md" | "lg";

const V: Record<Variant, string> = {
  primary: "bg-pen text-white hover:bg-pen-700 disabled:bg-pen/40",
  secondary: "bg-pen-100 text-pen hover:bg-pen-50 disabled:opacity-50",
  ghost: "bg-transparent text-pen hover:bg-pen-50 disabled:opacity-50",
  danger: "bg-void-50 text-void hover:bg-void/10 disabled:opacity-50",
  ink: "bg-ink text-white hover:bg-ink/90 disabled:opacity-50",
  outline: "bg-sheet text-ink ring-1 ring-inset ring-rule hover:bg-paper disabled:opacity-50",
};
const S: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[14px] rounded-xl gap-1.5",
  md: "h-12 px-5 text-[15px] rounded-2xl gap-2",
  lg: "h-14 px-6 text-[16px] rounded-2xl gap-2",
};

type Common = { variant?: Variant; size?: Size; block?: boolean; className?: string; children: React.ReactNode };

export function Button({
  variant = "primary", size = "md", block, className, children, loading, ...rest
}: Common & { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx("tap inline-flex select-none items-center justify-center font-medium", V[variant], S[size], block && "w-full", className)}
    >
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", block, className, children }: Common & { href: string }) {
  return (
    <Link href={href} className={cx("tap inline-flex select-none items-center justify-center font-medium", V[variant], S[size], block && "w-full", className)}>
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} aria-label={label} className={cx("tap grid size-10 shrink-0 place-items-center rounded-full", className)}>
      {children}
    </button>
  );
}
