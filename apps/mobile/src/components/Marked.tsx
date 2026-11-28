import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/core/theme';

/** lamha's highlighter: a lime stroke across the lower half of a total or a key word. */
export function Marked({ children }: { children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.stroke} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  stroke: { position: 'absolute', start: -4, end: -4, top: '52%', bottom: '8%', backgroundColor: colors.marker },
});
