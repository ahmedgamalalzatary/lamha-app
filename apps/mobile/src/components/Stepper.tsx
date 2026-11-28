import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, radius } from '@/core/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props {
  qty: number;
  onChange: (qty: number) => void;
  /** 0 lets the last one be removed (the minus becomes a bin). */
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  /** The item's name, for the screen reader ("كمية شاورما"). */
  label?: string;
}

/** lamha's quantity stepper: a white pill with + count − (a red bin at one when it can go to zero). */
export function Stepper({ qty, onChange, min = 0, max = Infinity, size = 'md', label }: Props) {
  const t = useT();
  const box = size === 'sm' ? 32 : 44;
  const removes = min === 0 && qty <= 1;
  const canDown = qty > min;
  const canUp = qty < max;
  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={label ? t('common.quantityOf', { name: label }) : t('common.quantity')}
      style={[styles.pill, { height: box }]}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('common.increase')}
        disabled={!canUp}
        onPress={() => onChange(qty + 1)}
        scaleTo={0.9}
        style={[styles.btn, { width: box, height: box, opacity: canUp ? 1 : 0.4 }]}
      >
        <Plus size={16} color={colors.primary} />
      </PressableScale>
      <AppText weight="semibold" size={15} style={styles.qty} accessibilityLiveRegion="polite">
        {String(qty)}
      </AppText>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={removes ? t('common.remove') : t('common.decrease')}
        disabled={!canDown}
        onPress={() => onChange(qty - 1)}
        scaleTo={0.9}
        style={[styles.btn, { width: box, height: box, opacity: canDown ? 1 : 0.4 }]}
      >
        {removes ? <Trash2 size={16} color={colors.danger} /> : <Minus size={16} color={colors.primary} />}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: radius.pill, backgroundColor: colors.sheet, borderWidth: 1, borderColor: colors.line },
  btn: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  qty: { minWidth: 24, textAlign: 'center' },
});
