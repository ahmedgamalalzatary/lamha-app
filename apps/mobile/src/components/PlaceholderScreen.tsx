import { Hourglass } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type TranslationKey, useT } from '@/core/i18n';
import { colors } from '@/core/theme';
import { EmptyState } from './EmptyState';

/** An empty tab until its phase builds it (Phase 0: empty role-based tab layouts). */
export function PlaceholderScreen({ title }: { title: TranslationKey }) {
  const t = useT();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <EmptyState icon={Hourglass} title={t(title)} message={t('common.soon')} />
    </SafeAreaView>
  );
}
