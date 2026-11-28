import type { StoreFilter } from '@tawsela/shared';
import { Bike, ChevronDown, Footprints, ListFilter, type LucideIcon, Star, Tag, Zap } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';

function Chip({ icon: Icon, label, on, menu, onPress }: { icon: LucideIcon; label: string; on: boolean; menu?: boolean; onPress: () => void }) {
  const tint = on ? colors.primary : colors.ink;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Icon size={16} color={tint} fill={Icon === Star || Icon === Zap ? tint : 'transparent'} />
      <AppText weight="medium" color={tint} size={13.5}>
        {label}
      </AppText>
      {menu ? <ChevronDown size={14} color={tint} /> : null}
    </PressableScale>
  );
}

/**
 * The filter chips (lamha's look, contract §6.3): رتب حسب ▾ · التقييم ▾ · توصيل سريع · الاستلام · خصومات · عروض التوصيل.
 */
export function FilterChips({
  filter,
  onChange,
  onSort,
  onRating,
}: {
  filter: StoreFilter;
  onChange: (filter: StoreFilter) => void;
  onSort: () => void;
  onRating: () => void;
}) {
  const t = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip icon={ListFilter} label={t('stores.sort')} menu on={!!filter.sort && filter.sort !== 'default'} onPress={onSort} />
      <Chip icon={Star} label={t('stores.rating')} menu on={filter.minRating !== undefined} onPress={onRating} />
      <Chip icon={Zap} label={t('stores.fast')} on={!!filter.fast} onPress={() => onChange({ ...filter, fast: !filter.fast })} />
      <Chip icon={Footprints} label={t('stores.pickup')} on={!!filter.pickup} onPress={() => onChange({ ...filter, pickup: !filter.pickup })} />
      <Chip icon={Tag} label={t('stores.discounts')} on={!!filter.discounts} onPress={() => onChange({ ...filter, discounts: !filter.discounts })} />
      <Chip icon={Bike} label={t('stores.freeDelivery')} on={!!filter.freeDelivery} onPress={() => onChange({ ...filter, freeDelivery: !filter.freeDelivery })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.sheet,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary50 },
});
