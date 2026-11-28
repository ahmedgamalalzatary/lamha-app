import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, fontSizes, spacing } from '@/core/theme';
import { AppText } from './AppText';
import { BackButton } from './BackButton';

type Tone = 'paper' | 'pen' | 'clear';
const BG: Record<Tone, string> = { paper: colors.paper, pen: colors.primary, clear: 'transparent' };

interface Props {
  title?: string;
  subtitle?: string;
  /** false hides the back button (tab roots). */
  back?: boolean;
  onBack?: () => void;
  /** Buttons on the far side. */
  actions?: ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

/** lamha's top bar: back chevron, a 17pt title with an optional grey subtitle, actions on the far side. */
export function TopBar({ title, subtitle, back = true, onBack, actions, tone = 'paper', style }: Props) {
  const onPen = tone === 'pen';
  return (
    <View style={[styles.bar, { backgroundColor: BG[tone] }, !back && styles.noBack, style]}>
      {back ? <BackButton onPress={onBack} onDark={onPen} /> : null}
      <View style={styles.titles}>
        {title ? (
          <AppText accessibilityRole="header" weight="semibold" size={fontSizes.topBar} color={onPen ? colors.sheet : colors.ink} numberOfLines={1}>
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText size={fontSizes.caption} color={onPen ? colors.primary100 : colors.ink3} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  noBack: { paddingStart: spacing.lg },
  titles: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
