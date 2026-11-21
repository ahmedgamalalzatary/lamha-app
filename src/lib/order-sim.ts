import type { Order, OrderStatus } from "./types";

/** Demo-compressed durations of each live step. Delivery happens when they all elapse. */
export const STEP_MS = {
  placed: 40_000,
  accepted: 12_000,
  preparing: 45_000,
  pickedUp: 60_000,
} as const;

export const FLOW: Exclude<OrderStatus, "cancelled" | "delivered">[] = ["placed", "accepted", "preparing", "pickedUp"];
export const TOTAL_MS = FLOW.reduce((s, k) => s + STEP_MS[k], 0);

type Timed = Pick<Order, "placedAt" | "offsetMs" | "etaMinutes" | "cancelledAt">;

export type OrderState = {
  status: OrderStatus;
  stepIndex: number;
  stepProgress: number;
  progress: number;
  canCancel: boolean;
  canEdit: boolean;
  cancelSecondsLeft: number;
  remainingMinutes: number;
};

export function orderState(o: Timed, now: number): OrderState {
  if (o.cancelledAt) {
    return { status: "cancelled", stepIndex: -1, stepProgress: 0, progress: 0, canCancel: false, canEdit: false, cancelSecondsLeft: 0, remainingMinutes: 0 };
  }
  const elapsed = Math.max(0, now + o.offsetMs - o.placedAt);
  if (elapsed >= TOTAL_MS) {
    return { status: "delivered", stepIndex: FLOW.length, stepProgress: 1, progress: 1, canCancel: false, canEdit: false, cancelSecondsLeft: 0, remainingMinutes: 0 };
  }
  let acc = 0;
  let i = 0;
  for (; i < FLOW.length; i++) {
    const d = STEP_MS[FLOW[i]];
    if (elapsed < acc + d) break;
    acc += d;
  }
  const status = FLOW[i];
  const placed = status === "placed";
  return {
    status,
    stepIndex: i,
    stepProgress: (elapsed - acc) / STEP_MS[status],
    progress: elapsed / TOTAL_MS,
    canCancel: placed,
    canEdit: placed,
    cancelSecondsLeft: placed ? Math.ceil((STEP_MS.placed - elapsed) / 1000) : 0,
    remainingMinutes: Math.max(1, Math.ceil(o.etaMinutes * (1 - elapsed / TOTAL_MS))),
  };
}

/** New offsetMs that moves the order to the start of its next status (presenter control). */
export function skipToNext(o: Timed, now: number): number {
  const elapsed = Math.max(0, now + o.offsetMs - o.placedAt);
  if (elapsed >= TOTAL_MS) return o.offsetMs;
  let acc = 0;
  for (const k of FLOW) {
    acc += STEP_MS[k];
    if (elapsed < acc) return o.offsetMs + (acc - elapsed);
  }
  return o.offsetMs;
}

export const STATUS_TEXT: Record<OrderStatus, { title: string; stamp: string; line: string }> = {
  placed: { title: "طلبك اتبعت للمحل", stamp: "اتبعت", line: "مستنيين المحل يأكد" },
  accepted: { title: "المحل أكد طلبك", stamp: "مؤكد", line: "المحل قبل الطلب" },
  preparing: { title: "طلبك بيتجهز", stamp: "بيتجهز", line: "المطبخ شغال على طلبك" },
  pickedUp: { title: "الطيار في الطريق", stamp: "في الطريق", line: "استلم الطلب وجاي لك" },
  delivered: { title: "وصل بالسلامة", stamp: "اتسلم", line: "بالهنا والشفا" },
  cancelled: { title: "الطلب اتلغى", stamp: "ملغي", line: "رجعنا فلوسك كاملة" },
};
