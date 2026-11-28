import { Image } from 'expo-image';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '@/core/theme';

interface Props {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  /** Greyscale, for a closed store (Android; iOS keeps the colour, see the closed shade). */
  grey?: boolean;
}

/** lamha's photo: a pale pen tile until the picture loads, then the picture covering it. */
export function Photo({ uri, style, grey }: Props) {
  return (
    <View style={[styles.tile, style]}>
      {uri ? (
        <Image source={{ uri }} contentFit="cover" transition={150} style={[StyleSheet.absoluteFill, grey ? styles.grey : null]} accessible={false} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden', backgroundColor: colors.primary50 },
  grey: { filter: [{ grayscale: 1 }] },
});
