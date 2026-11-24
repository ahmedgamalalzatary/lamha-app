import { type Address, addressLine } from '@tawsela/shared';
import { router } from 'expo-router';
import { Check, ChevronLeft, MapPin, Pencil, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PressableScale } from '@/components/PressableScale';
import { toast } from '@/components/Toast';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useAddresses, useAddressActions } from '../api/addresses';
import { useChosenAddress } from '../chosen-address';

/**
 * Tawsilty's "العناوين المحفوظة" sheet (saved-addresses-sheet-two-addresses.png): ✕, each address with
 * its landmark, "شارع، مبنى، شقه - المنطقة", "تعديل" and "حذف", the orange tick on the chosen one,
 * and "التوصيل إلى عنوان آخر — اختر موقع على الخريطة" at the foot. Tapping an address delivers there.
 */
export function AddressesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const addresses = useAddresses();
  const { address: chosen, choose } = useChosenAddress();
  const actions = useAddressActions();
  const [deleting, setDeleting] = useState<Address | null>(null);
  const remove = useSubmit(async (id: number) => {
    await actions.remove(id);
    toast.show(t('address.deleted'), 'success');
  });

  const go = (path: '/address/map' | `/address/${number}`) => {
    onClose();
    router.push(path);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View testID="addresses-sheet" style={styles.body}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.close} scaleTo={0.9}>
          <X size={22} color={colors.ink2} />
        </PressableScale>
        <AppText weight="bold" size={fontSizes.screenTitle}>
          {t('address.saved')}
        </AppText>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {addresses.isError ? (
            // [Open] Not captured: the failure and its retry (review F24).
            <View style={styles.failed}>
              <AppText color={colors.danger}>{t('address.loadFailed')}</AppText>
              <Button label={t('common.retry')} variant="soft" onPress={() => void addresses.refetch()} />
            </View>
          ) : addresses.isPending ? (
            [0, 1].map((i) => <Skeleton key={i} style={styles.skeleton} />)
          ) : addresses.data.length === 0 ? (
            <AppText color={colors.ink2}>{t('address.none')}</AppText>
          ) : (
            addresses.data.map((a, i) => {
              const on = a.id === chosen?.id;
              return (
                <View key={a.id} style={[styles.row, i > 0 && styles.divider]}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={a.landmark}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      choose(a.id);
                      onClose();
                    }}
                    scaleTo={0.98}
                    style={styles.pick}
                  >
                    <MapPin size={26} color={on ? colors.primary : colors.ink2} />
                    <View style={styles.text}>
                      <AppText weight="bold" size={fontSizes.listTitle}>
                        {a.landmark}
                      </AppText>
                      <AppText color={colors.ink2} size={fontSizes.body}>
                        {addressLine(a)}
                      </AppText>
                    </View>
                    {on ? (
                      <View style={styles.tick}>
                        <Check size={16} color={colors.bg} strokeWidth={3} />
                      </View>
                    ) : null}
                  </PressableScale>
                  <View style={styles.actions}>
                    <Action icon={Pencil} label={t('address.edit')} color={colors.primary} onPress={() => go(`/address/${a.id}`)} />
                    <Action icon={Trash2} label={t('address.delete')} color={colors.danger} onPress={() => setDeleting(a)} />
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('address.other')} onPress={() => go('/address/map')} style={styles.other}>
          <MapPin size={24} color={colors.primary} />
          <View style={styles.text}>
            <AppText weight="bold" size={fontSizes.listTitle}>
              {t('address.other')}
            </AppText>
            <AppText color={colors.ink2} size={fontSizes.body}>
              {t('address.otherText')}
            </AppText>
          </View>
          <ChevronLeft size={22} color={colors.ink2} />
        </PressableScale>
      </View>
      <ConfirmDialog
        visible={deleting !== null}
        title={t('address.deleteTitle')}
        message={t('address.deleteBody')}
        confirmLabel={t('common.confirm')}
        tone="primary"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const id = deleting!.id;
          setDeleting(null);
          return remove.run(id);
        }}
      />
    </BottomSheet>
  );
}

function Action({ icon: Icon, label, color, onPress }: { icon: typeof Pencil; label: string; color: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} scaleTo={0.92} style={styles.action}>
      <Icon size={16} color={color} />
      <AppText weight="semibold" color={color} size={fontSizes.body}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, minHeight: 560 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 1 },
  failed: { gap: spacing.md, alignItems: 'flex-start' },
  skeleton: { height: 72, borderRadius: radius.md },
  listContent: { gap: spacing.md },
  row: { gap: spacing.sm, paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  pick: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.xl, paddingStart: 26 + spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  other: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
