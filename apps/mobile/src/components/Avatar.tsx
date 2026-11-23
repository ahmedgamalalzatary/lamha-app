import { UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/core/theme';

/** Tawsilty's default avatar: a light-blue circle with a white figure and a soft orange ring. */
export function Avatar({ size = 84 }: { size?: number }) {
  return (
    <View style={[styles.ring, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <UserRound size={size * 0.78} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1} style={{ marginTop: size * 0.22 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { backgroundColor: colors.primary50, borderWidth: 2, borderColor: colors.primary100, alignItems: 'center', justifyContent: 'center' },
  circle: { backgroundColor: '#97BBE2', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden' },
});
