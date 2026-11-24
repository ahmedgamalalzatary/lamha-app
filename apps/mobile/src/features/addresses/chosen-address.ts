import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Address } from '@tawsela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useSession } from '@/core/auth/session';
import { useAddresses } from './api/addresses';

/**
 * The address the customer delivers to (the tick in "العناوين المحفوظة", "التوصيل إلى <address>").
 * [Derived] Remembered on this phone per account; it starts as the default address.
 */
const useChosenStore = create<{ byUser: Record<number, number>; choose: (userId: number, addressId: number) => void }>()(
  persist(
    (set) => ({
      byUser: {},
      choose: (userId, addressId) => set((s) => ({ byUser: { ...s.byUser, [userId]: addressId } })),
    }),
    { name: 'tawsela.address.chosen', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ byUser: s.byUser }) },
  ),
);

/** The chosen address (or the default when the chosen one is gone), and how to choose another. */
export function useChosenAddress(): { address: Address | undefined; choose: (id: number) => void } {
  const userId = useSession((s) => s.user?.id);
  const addresses = useAddresses();
  const chosenId = useChosenStore((s) => (userId === undefined ? undefined : s.byUser[userId]));
  const choose = useChosenStore((s) => s.choose);
  const list = addresses.data ?? [];
  const address = list.find((a) => a.id === chosenId) ?? list.find((a) => a.isDefault) ?? list[0];
  return { address, choose: (id) => userId !== undefined && choose(userId, id) };
}

/**
 * What store lists and search send (§8.9): the chosen address, once the addresses are known, so a list
 * never shows every store first. Accounts with no addresses (admins) are ready at once.
 */
export function useDeliveryScope(): { ready: boolean; addressId: number | undefined } {
  const addresses = useAddresses();
  const { address } = useChosenAddress();
  return { ready: !addresses.isLoading, addressId: address?.id };
}

/** Forgets every choice (tests start from nothing: a reset database reuses address ids). */
export const resetChosenAddresses = () => useChosenStore.setState({ byUser: {} });

/** Choosing outside React (after a save). */
export function chooseAddress(addressId: number) {
  const userId = useSession.getState().user?.id;
  if (userId !== undefined) useChosenStore.getState().choose(userId, addressId);
}
