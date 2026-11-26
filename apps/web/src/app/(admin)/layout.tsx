import { AreaShell } from '@/features/shell/components/AreaShell';

/** The admin area: admins only (contract §2). */
export default function AdminLayout({ children }: LayoutProps<'/'>) {
  return <AreaShell area="admin">{children}</AreaShell>;
}
