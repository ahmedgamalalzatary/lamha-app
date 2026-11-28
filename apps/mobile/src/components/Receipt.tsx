import { formatMoney } from '@tawsela/shared';
import { type ReactNode, useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useLocale } from '@/core/i18n';
import { colors, fontSizes, shadows, spacing } from '@/core/theme';
import { AppText } from './AppText';

/** Depth of one tooth of the torn edge (lamha's `--z`). */
const Z = 7;

/** One row of zigzag teeth across `width`, pointing down (bottom edge) or up (top edge). */
function TornEdge({ width, edge }: { width: number; edge: 'top' | 'bottom' }) {
  if (width <= 0) return null;
  const teeth = Math.max(1, Math.round(width / (2 * Z)));
  const step = width / teeth;
  let d = edge === 'bottom' ? `M0 0` : `M0 ${Z}`;
  for (let i = 0; i < teeth; i++) {
    const x = i * step;
    d += edge === 'bottom' ? ` L${x + step / 2} ${Z} L${x + step} 0` : ` L${x + step / 2} 0 L${x + step} ${Z}`;
  }
  d += edge === 'bottom' ? ` Z` : ` Z`;
  return (
    <Svg width={width} height={Z} style={edge === 'bottom' ? styles.edgeBottom : styles.edgeTop} pointerEvents="none">
      <Path d={d} fill={colors.sheet} />
    </Svg>
  );
}

interface ReceiptProps {
  children: ReactNode;
  /** Torn on both edges, like a slip ripped from the roll (lamha's `receipt-top`). */
  top?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** lamha's receipt: a white slip with a torn zigzag bottom edge and a soft shadow. */
export function Receipt({ children, top, style }: ReceiptProps) {
  const [width, setWidth] = useState(0);
  return (
    <View style={[styles.shadow, { marginTop: top ? Z : 0, marginBottom: Z }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {top ? <TornEdge width={width} edge="top" /> : null}
      <View style={[styles.body, style]}>{children}</View>
      <TornEdge width={width} edge="bottom" />
    </View>
  );
}

/** The dotted line between a label and its amount. */
export function Leader() {
  return (
    <View style={styles.leader} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg height={2} width="100%">
        <Line x1="1" y1="1" x2="100%" y2="1" stroke={colors.leader} strokeWidth={2} strokeDasharray="0.1 4" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** The dashed perforation between a receipt's sections. */
export function Perforation({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityRole="none" style={[styles.perf, style]}>
      <Svg height={2} width="100%">
        <Line x1="0" y1="1" x2="100%" y2="1" stroke={colors.line} strokeWidth={2} strokeDasharray="6 4" />
      </Svg>
    </View>
  );
}

type Tone = 'ink' | 'success' | 'danger' | 'muted';
const TONE: Record<Tone, string> = { ink: colors.ink, success: colors.success, danger: colors.danger, muted: colors.ink3 };

interface RowProps {
  label: ReactNode;
  /** Shown as money ("170 ج.م"). */
  amount?: number;
  /** The old amount, struck through before the new one. */
  struck?: number;
  /** Free text in place of an amount ("مجاني"). */
  value?: ReactNode;
  note?: string;
  tone?: Tone;
  bold?: boolean;
}

/** A receipt line: label, dotted leader, amount; an optional grey note under it. */
export function ReceiptRow({ label, amount, struck, value, note, tone = 'ink', bold }: RowProps) {
  const locale = useLocale();
  const color = TONE[tone];
  const weight = bold ? 'semibold' : 'regular';
  return (
    <View style={styles.row}>
      <View style={styles.line}>
        {typeof label === 'string' ? (
          <AppText weight={weight} color={color}>
            {label}
          </AppText>
        ) : (
          label
        )}
        <Leader />
        {struck !== undefined ? (
          <AppText size={13} color={colors.ink3} style={styles.struck}>
            {formatMoney(struck, locale)}
          </AppText>
        ) : null}
        {amount !== undefined ? (
          <AppText weight={weight} color={color}>
            {formatMoney(amount, locale)}
          </AppText>
        ) : null}
        {value !== undefined ? (
          typeof value === 'string' ? (
            <AppText weight={weight} color={color}>
              {value}
            </AppText>
          ) : (
            value
          )
        ) : null}
      </View>
      {note ? (
        <AppText size={fontSizes.caption} color={colors.ink3}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { ...shadows.receipt },
  body: { backgroundColor: colors.sheet, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  edgeBottom: { position: 'absolute', bottom: -Z, start: 0 },
  edgeTop: { position: 'absolute', top: -Z, start: 0 },
  leader: { flex: 1, minWidth: 12, marginHorizontal: spacing.sm, alignSelf: 'center', marginTop: 6 },
  perf: { marginVertical: 14 },
  row: { paddingVertical: 6, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'baseline' },
  struck: { textDecorationLine: 'line-through', textDecorationColor: colors.danger, marginEnd: spacing.sm },
});
