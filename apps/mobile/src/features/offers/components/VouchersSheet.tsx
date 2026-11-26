import { formatAmount, formatDay, type Voucher } from '@tawsela/shared';
import * as Clipboard from 'expo-clipboard';
import { Clock, Copy, Tag } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { PressableScale } from '@/components/PressableScale';
import { toast } from '@/components/Toast';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

/**
 * قسائمي (contract §8.4, store-my-vouchers-sheet): each code with its name in red, its minimum order,
 * "صالح حتى …" and the code on a gold button that copies it, for "وفر على طلبك" at checkout.
 */
export function VouchersSheet({ visible, vouchers, onClose }: { visible: boolean; vouchers: Voucher[]; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    toast.show(t('offers.copied'), 'success');
  };
  return (
    <BottomSheet visible={visible} title={t('offers.myVouchers')} onClose={onClose} scroll>
      <View style={styles.list}>
        {vouchers.map((v) => (
          <View key={v.id} style={styles.card}>
            <View style={styles.head}>
              <Tag size={18} color={colors.danger} fill={colors.danger} />
              <AppText weight="bold" size={fontSizes.listTitle} color={colors.danger}>
                {v.title}
              </AppText>
            </View>
            <AppText color={colors.ink2}>{t('offers.minOrder', { amount: formatAmount(v.minOrder, locale) })}</AppText>
            <View style={styles.foot}>
              <View style={styles.until}>
                {v.endsAt ? (
                  <>
                    <Clock size={14} color={colors.ink2} />
                    <AppText color={colors.ink2} size={fontSizes.caption}>
                      {t('offers.validUntil', { date: formatDay(v.endsAt, locale) })}
                    </AppText>
                  </>
                ) : null}
              </View>
              <PressableScale accessibilityRole="button" accessibilityLabel={t('offers.copy', { code: v.code })} onPress={() => void copy(v.code)} style={styles.code}>
                <AppText weight="bold" color={colors.gold}>
                  {v.code}
                </AppText>
                <Copy size={16} color={colors.gold} />
              </PressableScale>
            </View>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  until: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.voucherLine,
    backgroundColor: colors.voucher50,
  },
});
