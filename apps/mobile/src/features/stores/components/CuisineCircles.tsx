import type { Cuisine } from '@tawsela/shared';
import { Image } from 'expo-image';
import { UtensilsCrossed } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { mediaUrl } from '@/core/api/client';
import { colors, fontSizes, spacing } from '@/core/theme';

const SIZE = 100;

/** Cuisine circles (contract §8.3, restaurants only). The chosen one has an orange ring; tap it again to clear. */
export function CuisineCircles({ cuisines, selected, onSelect }: { cuisines: Cuisine[]; selected?: number; onSelect: (id?: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {cuisines.map((c) => {
        const on = c.id === selected;
        const uri = mediaUrl(c.image);
        return (
          <PressableScale
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={c.name}
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(on ? undefined : c.id)}
            style={styles.item}
          >
            <View style={[styles.circle, on && styles.circleOn]}>
              {uri ? <Image source={{ uri }} contentFit="cover" style={styles.image} /> : <UtensilsCrossed size={32} color={colors.primary} />}
            </View>
            <AppText weight={on ? 'bold' : 'medium'} color={on ? colors.primary : colors.ink} size={fontSizes.listTitle} numberOfLines={1}>
              {c.name}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  item: { alignItems: 'center', gap: spacing.md, width: SIZE + 8 },
  circle: {
    width: SIZE + 8,
    height: SIZE + 8,
    borderRadius: (SIZE + 8) / 2,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleOn: { borderColor: colors.primary },
  image: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
});
