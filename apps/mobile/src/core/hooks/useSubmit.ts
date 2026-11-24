import { useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { errorMessage } from '../api/error-message';
import { haptic } from '../motion/haptics';

/**
 * Runs a form's call once at a time; a failure shows Tawsilty's red toast with the API's reason.
 * The lock is a ref, set before the call starts, so a double tap before the next render is ignored.
 */
export function useSubmit<A extends unknown[]>(fn: (...args: A) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const run = async (...args: A) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await fn(...args);
    } catch (e) {
      haptic.error();
      toast.show(errorMessage(e), 'error');
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return { run, busy };
}
