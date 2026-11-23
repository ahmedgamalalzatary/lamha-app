import { cx } from "@/lib/format";

const TONES = { stamp: "text-stamp", void: "text-void", pen: "text-pen", ink: "text-ink" } as const;

export function Stamp({
  children, tone = "stamp", animate, className, size = "md",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  animate?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const s = size === "sm" ? "text-[15px] px-2.5 pt-1 pb-1.5" : size === "lg" ? "text-[28px] px-4 pt-2 pb-3" : "text-[19px]";
  return <span className={cx("stamp", TONES[tone], s, animate && "stamp-in", className)}>{children}</span>;
}
