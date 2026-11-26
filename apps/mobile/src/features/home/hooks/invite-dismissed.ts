import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'tawsela.home.inviteDismissed';

/**
 * Whether the customer closed the invite card (contract §8.2, "dismissible ✕"). [Open] Tawsilty's
 * capture does not show when it comes back; here it stays hidden on this phone. null while reading.
 */
export function useInviteDismissed(): [boolean | null, () => void] {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(KEY)
      .then((v) => live && setDismissed(v === '1'))
      .catch(() => live && setDismissed(false));
    return () => {
      live = false;
    };
  }, []);
  const dismiss = useCallback(() => {
    setDismissed(true);
    void AsyncStorage.setItem(KEY, '1').catch(() => undefined);
  }, []);
  return [dismissed, dismiss];
}
