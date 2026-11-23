'use client';

import { Hourglass } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { EmptyState } from '@/components/ui';
import { pageTitle } from '@/features/nav/admin-nav';

/** A sidebar page whose phase has not come yet: its name and Tawsilty's empty state. */
export function ComingSoon() {
  const title = pageTitle(usePathname());
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <EmptyState icon={Hourglass} title="قريباً" />
    </div>
  );
}
