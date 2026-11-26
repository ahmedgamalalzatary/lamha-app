'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useSession } from '@/core/api/client';
import { type Area, areaRedirect } from '../area';

/** Shows the area only to the account it belongs to; anyone else is sent where they belong. */
export function AreaGate({ area, children }: { area: Area; children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const target = areaRedirect(session, area);
  useEffect(() => {
    if (target && target !== 'wait') router.replace(target);
  }, [target, router]);
  return target === null ? children : null;
}
