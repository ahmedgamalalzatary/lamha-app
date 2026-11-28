import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, shadows } from '@/core/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  style?: StyleProp<ViewStyle>;
}

/** lamha's segmented tabs: a pale pen track; the chosen tab is a white raised chip with pen text. */
export function Segmented<T extends string>({ value, onChange, options, style }: Props<T>) {
  return (
    <View accessibilityRole="tablist" style={[styles.track, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.tab, on && styles.on]}
          >
            <AppText weight="medium" color={on ? colors.primary : colors.ink2}>
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, borderRadius: radius.lg, backgroundColor: colors.primary50 },
  tab: { flex: 1, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.sheet, ...shadows.sheet },
});
