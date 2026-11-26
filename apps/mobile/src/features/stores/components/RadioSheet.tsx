import { Check, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { colors, fontSizes, spacing } from '@/core/theme';

export interface RadioOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
}


/**
 * Tawsilty's radio sheets (contract §6.3, "رتب حسب" and "التقييم"): the checked row is orange with a
 * filled orange circle and a tick. Picking a row closes the sheet.
 */
export function RadioSheet<T>({
  visible,
  title,
  options,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View accessibilityRole="radiogroup">
        {options.map(({ value: v, label, icon: Icon }) => {
          const on = v === value;
          return (
            <Pressable
              key={String(v)}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: on }}
              onPress={() => {
                onChange(v);
                onClose();
              }}
              style={styles.row}
            >
              {Icon ? <Icon size={18} color={colors.star} fill={colors.star} /> : null}
              <AppText weight={on ? 'bold' : 'regular'} color={on ? colors.primary : colors.ink} size={fontSizes.listTitle} style={styles.label}>
                {label}
              </AppText>
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={16} color={colors.bg} strokeWidth={3} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  label: { flex: 1 },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.ink2, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
});
