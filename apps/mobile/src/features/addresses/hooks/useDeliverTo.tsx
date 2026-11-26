import { router } from 'expo-router';
import { useState } from 'react';
import { useT } from '@/core/i18n';
import { useAddresses } from '../api/addresses';
import { useChosenAddress } from './chosen-address';
import { AddressesSheet } from '../components/AddressesSheet';

/**
 * "التوصيل إلى <address>" in the home header and the store lists (contract §8.2, §8.3, §8.9): the chosen
 * address's landmark, or "حدد موقعك". Pressing it opens the saved addresses, or the map once it is known
 * there are none; while they load or when they fail, the sheet says so (review F24).
 */
export function useDeliverTo() {
  const t = useT();
  const addresses = useAddresses();
  const { address } = useChosenAddress();
  const [open, setOpen] = useState(false);
  return {
    label: address?.landmark ?? t('home.chooseAddress'),
    press: async () => {
      // A press before the list arrives waits for it; a failed list opens the sheet, which says so.
      const list = addresses.data ?? (addresses.isError ? undefined : (await addresses.refetch()).data);
      if (list?.length === 0) router.push('/address/map');
      else setOpen(true);
    },
    sheet: <AddressesSheet visible={open} onClose={() => setOpen(false)} />,
  };
}
