"use client";
import { useEffect, useState } from "react";
import { useCustomer, currentQuote } from "./store/customer";
import { orderState } from "./order-sim";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function useActiveOrder() {
  const orders = useCustomer((s) => s.orders);
  const now = useNow(1000);
  const active = orders.find((o) => {
    const st = orderState(o, now).status;
    return st !== "delivered" && st !== "cancelled";
  });
  return { order: active, state: active ? orderState(active, now) : null, now };
}

export function useCartSummary() {
  const s = useCustomer();
  const q = currentQuote(s);
  const count = s.cart.lines.reduce((n, l) => n + l.qty, 0);
  return { count, quote: q, storeId: s.cart.storeId };
}
