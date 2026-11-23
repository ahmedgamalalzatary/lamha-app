import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, fonts, fontSizes } from '@/core/theme';

type Weight = keyof typeof fonts;

interface Props extends TextProps {
  weight?: Weight;
  size?: number;
  color?: string;
}

/** Text in Alexandria. Every screen uses this instead of a bare <Text>. */
export function AppText({ weight = 'regular', size = fontSizes.body, color = colors.ink, style, ...rest }: Props) {
  return <Text {...rest} style={[styles.base, { fontFamily: fonts[weight], fontSize: size, color }, style]} />;
}

const styles = StyleSheet.create({
  base: { textAlign: 'auto', writingDirection: 'auto' },
});
