import { Platform, StyleSheet } from 'react-native';
import { colors } from '@/core/theme';

/**
 * A closed store's picture is greyscale, as in Tawsilty (contract §6, §8.3, §8.4). React Native's
 * grayscale filter works on Android only, so iOS keeps the dark shade instead.
 */
export const GREYSCALE = Platform.OS === 'android';

export const closedLook = StyleSheet.create({
  greyscale: { filter: [{ grayscale: 1 }] },
  shade: { backgroundColor: colors.closedShade },
});
