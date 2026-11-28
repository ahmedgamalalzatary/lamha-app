import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/core/theme';
import { AppText } from './AppText';

interface Props {
  name: string;
  logo?: string | null;
  size?: number;
}

/**
 * lamha's store logo: a rounded square (30% corners) with a white ring. Shows the store's logo, or the
 * first letter of its name on a pale pen tile when it has none.
 */
export function StoreLogo({ name, logo, size = 44 }: Props) {
  const corner = size * 0.3;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size, borderRadius: corner }]}
    >
      {logo ? (
        <Image source={{ uri: logo }} contentFit="cover" style={[StyleSheet.absoluteFill, { borderRadius: corner }]} />
      ) : (
        <AppText weight="bold" size={size * 0.5} color={colors.primary}>
          {name.trim().charAt(0)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.primary50, borderWidth: 2, borderColor: colors.sheet },
});
