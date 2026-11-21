"use client";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function ConflictSheet({ open, onOpenChange, from, to, onReplace }: { open: boolean; onOpenChange: (v: boolean) => void; from: string; to: string; onReplace: () => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="تبدأ فاتورة جديدة؟" description={`فاتورتك فيها طلبات من ${from}. كل طلب بيوصل من محل واحد عشان يوصلك سخن وفي ميعاده.`}>
      <div className="grid gap-2.5 px-5 pb-6 pt-3">
        <Button block size="lg" onClick={onReplace}>امسح القديمة وابدأ من {to}</Button>
        <Button block size="lg" variant="secondary" onClick={() => onOpenChange(false)}>خليني في فاتورة {from}</Button>
      </div>
    </Sheet>
  );
}
