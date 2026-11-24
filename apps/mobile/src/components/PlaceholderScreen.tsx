import { Hourglass } from 'lucide-react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type TranslationKey, useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { BackButton } from './BackButton';
import { EmptyState } from './EmptyState';

/** An empty screen until its phase builds it. `back` for a pushed screen (a store list, a store page). */
export function PlaceholderScreen({ title, back }: { title: TranslationKey; back?: boolean }) {
  const t = useT();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {back ? (
        <View style={{ padding: spacing.lg }}>
          <BackButton />
        </View>
      ) : null}
      <EmptyState icon={Hourglass} title={t(title)} message={t('common.soon')} />
    </SafeAreaView>
  );
}
