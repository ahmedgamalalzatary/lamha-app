import { RotateCw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';

/**
 * "لا يوجد طلبات حاليا" and the orange "اعادة التحميل" with its ↻, the same on الرئيسية and الطلبات
 * الحالية (driver/driver-home-active-switch-no-orders-reload.jpg, driver-current-orders-empty-reload.jpg).
 */
export function NoOrdersNow({ onReload, busy, note }: { onReload: () => void; busy: boolean; note?: string }) {
  const t = useT();
  return (
    <View style={styles.box}>
      <AppText weight="bold" size={fontSizes.sectionTitle + 1} style={styles.centred}>
        {t('driver.noOffers')}
      </AppText>
      {note ? (
        <AppText color={colors.ink2} style={styles.centred}>
          {note}
        </AppText>
      ) : null}
      <Button label={t('driver.reload')} icon={RotateCw} loading={busy} onPress={onReload} style={styles.reload} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexGrow: 1, justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.xxl },
  centred: { textAlign: 'center' },
  reload: { alignSelf: 'stretch' },
});
