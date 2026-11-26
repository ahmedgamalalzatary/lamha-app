import { formatAmount, type InviteOverview, type Locale } from '@tawsela/shared';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { Linking, Share } from 'react-native';
import { toast } from '@/components/Toast';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';
import type { TranslationKey } from '@/core/i18n';

export const inviteKey = ['invite'] as const;

export const inviteApi = {
  get: () => api<InviteOverview>('/me/invite'),
};

/** ادعُ أصدقاءك: the code, the rules and the friends who joined (customers only). */
export function useInvite() {
  const user = useSession((s) => s.user);
  return useQuery({ queryKey: [...inviteKey, user?.id], queryFn: inviteApi.get, enabled: user?.role === 'customer' });
}

type T = (key: TranslationKey, values?: Record<string, string | number>) => string;

/** The text a friend receives [Derived: Tawsilty's message is not captured]. */
const messageFor = (t: T, code: string, friendReward: number, locale: Locale) => t('invite.shareMessage', { code, amount: formatAmount(friendReward, locale) });

/** نسخ, مشاركة and واتساب for the code. */
export const inviteActions = {
  copy: async (t: T, code: string) => {
    await Clipboard.setStringAsync(code);
    toast.show(t('invite.copied'), 'success');
  },
  share: (t: T, code: string, friendReward: number, locale: Locale) => Share.share({ message: messageFor(t, code, friendReward, locale) }),
  whatsapp: (t: T, code: string, friendReward: number, locale: Locale) =>
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(messageFor(t, code, friendReward, locale))}`).catch(() =>
      Share.share({ message: messageFor(t, code, friendReward, locale) }),
    ),
};
