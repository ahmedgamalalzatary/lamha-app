"use client";
import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { useCustomer } from "@/lib/store/customer";
import { usePartner } from "@/lib/store/partner";
import { useRider } from "@/lib/store/rider";
import { Wordmark } from "./ui/wordmark";

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      useCustomer.persist.rehydrate(),
      usePartner.persist.rehydrate(),
      useRider.persist.rehydrate(),
    ]).finally(() => setReady(true));
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {ready ? (
        children
      ) : (
        <div className="grid min-h-dvh place-items-center bg-pen">
          <Wordmark className="text-6xl text-white" blink />
        </div>
      )}
      <Toaster
        position="top-center"
        dir="rtl"
        offset={16}
        toastOptions={{
          style: {
            fontFamily: "var(--font-sans)",
            background: "var(--color-ink)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
          },
        }}
      />
    </MotionConfig>
  );
}
