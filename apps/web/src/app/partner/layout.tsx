import { AreaShell } from '@/features/shell/components/AreaShell';

/** The partner area: partners only, their own store (contract §11.1). */
export default function PartnerLayout({ children }: LayoutProps<'/partner'>) {
  return <AreaShell area="partner">{children}</AreaShell>;
}
