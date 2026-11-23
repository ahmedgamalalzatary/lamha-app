'use client';

import type { ReactNode } from 'react';
import { AreaGate } from '@/features/auth/AreaGate';
import { ADMIN_NAV, PARTNER_NAV } from '@/features/nav/admin-nav';
import { Sidebar } from '@/features/nav/Sidebar';

/** One area of the dashboard: its sidebar on the right and the page, for its own role only. */
export function AreaShell({ area, children }: { area: 'admin' | 'partner'; children: ReactNode }) {
  return (
    <AreaGate area={area}>
      <div className="flex min-h-screen w-full">
        <Sidebar nav={area === 'admin' ? ADMIN_NAV : PARTNER_NAV} />
        <main className="min-w-0 flex-1 p-8">{children}</main>
      </div>
    </AreaGate>
  );
}
