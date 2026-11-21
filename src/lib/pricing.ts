import type { CartLine, Quote, QuoteInput, QuoteLine } from "./types";

/** One loyalty point is worth this many EGP. Points redeem in steps of POINT_STEP. */
export const POINT_VALUE = 0.1;
export const POINT_STEP = 100;

const round = (n: number) => Math.round(n * 100) / 100;

export function lineUnitPrice(line: Pick<CartLine, "basePrice" | "choices">): number {
  return line.basePrice + line.choices.reduce((s, c) => s + c.price, 0);
}

export function lineTotal(line: CartLine): number {
  return lineUnitPrice(line) * line.qty;
}

export function quote(input: QuoteInput): Quote {
  const { lines, store, promo, tip = 0 } = input;
  const subtotal = round(lines.reduce((s, l) => s + lineTotal(l), 0));
  const out: QuoteLine[] = [{ key: "subtotal", label: "الطلبات", amount: subtotal }];

  let promoError: string | undefined;
  let promoActive = false;
  if (promo) {
    if (subtotal < promo.minSubtotal) {
      promoError = `الكود ${promo.code} يحتاج طلب بـ ${promo.minSubtotal} ج.م على الأقل، ناقصك ${round(promo.minSubtotal - subtotal)} ج.م`;
    } else {
      promoActive = true;
    }
  }

  const freeByThreshold = store.freeDeliveryOver !== undefined && subtotal >= store.freeDeliveryOver;
  const freeByPromo = promoActive && promo!.kind === "freeDelivery";
  const delivery = freeByThreshold || freeByPromo ? 0 : store.deliveryFee;
  out.push({
    key: "delivery",
    label: "التوصيل",
    amount: delivery,
    struck: delivery === 0 && store.deliveryFee > 0 ? store.deliveryFee : undefined,
    note: freeByThreshold ? `مجاني لأن طلبك فوق ${store.freeDeliveryOver} ج.م` : freeByPromo ? `بكود ${promo!.code}` : undefined,
  });
  out.push({ key: "service", label: "رسوم الخدمة", amount: 0, note: "لمحة مبتاخدش رسوم خدمة" });

  if (promoActive && promo!.kind !== "freeDelivery") {
    let d = promo!.kind === "percent" ? (subtotal * promo!.value) / 100 : promo!.value;
    if (promo!.maxDiscount !== undefined) d = Math.min(d, promo!.maxDiscount);
    d = Math.min(round(d), subtotal);
    out.push({ key: "promo", label: `كود ${promo!.code}`, amount: -d, note: promo!.label });
  }

  let pointsUsed = 0;
  const requested = input.pointsToRedeem ?? 0;
  if (requested >= POINT_STEP && subtotal > 0) {
    const steps = Math.floor(requested / POINT_STEP);
    pointsUsed = steps * POINT_STEP;
    let value = round(pointsUsed * POINT_VALUE);
    if (value > subtotal) {
      value = subtotal;
      pointsUsed = Math.ceil(subtotal / POINT_VALUE);
    }
    out.push({ key: "points", label: `${pointsUsed} نقطة`, amount: -value });
  }

  if (tip > 0) out.push({ key: "tip", label: "إكرامية الطيار", amount: tip, note: "بتوصله كاملة" });

  const total = round(Math.max(0, out.reduce((s, l) => s + l.amount, 0)));
  const walletApplied = input.useWallet ? round(Math.min(total, input.walletBalance ?? 0)) : 0;

  return {
    lines: out,
    subtotal,
    total,
    walletApplied,
    dueOnDelivery: round(total - walletApplied),
    belowMinimumBy: round(Math.max(0, store.minOrder - subtotal)),
    promoError,
    pointsUsed,
  };
}
