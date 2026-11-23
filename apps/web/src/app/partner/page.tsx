import { redirect } from 'next/navigation';

/** The partner area opens on its orders. */
export default function PartnerHome() {
  redirect('/partner/orders');
}
