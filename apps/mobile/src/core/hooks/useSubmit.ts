import { useState } from 'react';
import { toast } from '@/components/Toast';
import { errorMessage } from '../api/error-message';
import { haptic } from '../motion/haptics';

/** Runs a form's call once at a time; a failure shows Tawsilty's red toast with the API's reason. */
export function useSubmit<A extends unknown[]>(fn: (...args: A) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const run = async (...args: A) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn(...args);
    } catch (e) {
      haptic.error();
      toast.show(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}
