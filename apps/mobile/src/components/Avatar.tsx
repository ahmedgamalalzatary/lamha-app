import { Image } from 'expo-image';
import { UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/core/api/client';
import { colors } from '@/core/theme';

/**
 * Tawsilty's avatar: the account's photo, or by default a light-blue circle with a white figure;
 * a soft orange ring around it.
 */
export function Avatar({ size = 84, photo = null }: { size?: number; photo?: string | null }) {
  const uri = mediaUrl(photo);
  return (
    <View style={[styles.ring, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} transition={150} />
        ) : (
          <UserRound size={size * 0.78} color={colors.bg} fill={colors.bg} strokeWidth={1} style={{ marginTop: size * 0.22 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { backgroundColor: colors.primary50, borderWidth: 2, borderColor: colors.primary100, alignItems: 'center', justifyContent: 'center' },
  circle: { backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden' },
});
