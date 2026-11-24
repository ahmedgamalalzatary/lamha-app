'use client';

import { useParams } from 'next/navigation';
import { StoreFormPage } from './StoreFormPage';

/** /stores/[id]: the store's settings and partner accounts. */
export function StoreEditRoute() {
  const { id } = useParams<{ id: string }>();
  return <StoreFormPage storeId={Number(id)} />;
}
