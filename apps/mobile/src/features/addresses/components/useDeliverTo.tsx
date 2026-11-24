import { router } from 'expo-router';
import { useState } from 'react';
import { useT } from '@/core/i18n';
import { useAddresses } from '../api/addresses';
import { useChosenAddress } from '../chosen-address';
import { AddressesSheet } from './AddressesSheet';

/**
 * "التوصيل إلى <address>" in the home header and the store lists (contract §8.2, §8.3, §8.9): the chosen
 * address's landmark, or "حدد موقعك". Pressing it opens the saved addresses, or the map when there are none.
 */
export function useDeliverTo() {
  const t = useT();
  const addresses = useAddresses();
  const { address } = useChosenAddress();
  const [open, setOpen] = useState(false);
  return {
    label: address?.landmark ?? t('home.chooseAddress'),
    press: () => (addresses.data?.length ? setOpen(true) : router.push('/address/map')),
    sheet: <AddressesSheet visible={open} onClose={() => setOpen(false)} />,
  };
}
