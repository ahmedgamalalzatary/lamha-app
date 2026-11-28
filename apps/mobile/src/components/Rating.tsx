import { Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, fontSizes } from '@/core/theme';
import { AppText } from './AppText';

/** 960 → "960", 2140 → "2.1k". */
export function formatCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

/** lamha's rating: a lime-filled gold star, the value, and the count in brackets. */
export function Rating({ value, count, size = fontSizes.caption }: { value: number; count?: number; size?: number }) {
  const t = useT();
  const shown = value.toFixed(1);
  return (
    <View accessible accessibilityLabel={t('common.rating', { value: shown })} style={styles.row}>
      <Star size={14} color={colors.star} fill={colors.marker} />
      <AppText weight="medium" size={size}>
        {shown}
      </AppText>
      {count !== undefined ? (
        <AppText size={size} color={colors.ink3}>
          {`(${formatCount(count)})`}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
