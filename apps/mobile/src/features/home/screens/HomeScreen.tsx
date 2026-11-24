import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { useHome } from '../api/home';
import { HomeHeader } from '../components/HomeHeader';
import { HomeTiles, HomeTilesSkeleton } from '../components/HomeTiles';
import { InviteCard } from '../components/InviteCard';
import { useInviteDismissed } from '../invite-dismissed';

/**
 * The customer's الرئيسية (contract §8.2): header with the address and search, the tiles, and the
 * invite card. Offers, banners and coloured sections join it in Phase 19.
 */
export function HomeScreen() {
  const t = useT();
  const home = useHome();
  const [inviteDismissed, dismissInvite] = useInviteDismissed();

  return (
    <View style={styles.screen}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => void home.refetch()} tintColor={colors.primary} />}
      >
        {home.isPending ? (
          <HomeTilesSkeleton />
        ) : home.isError ? (
          <View style={styles.errorBox}>
            <AppText color={colors.danger}>{errorMessage(home.error)}</AppText>
            <Button label={t('common.retry')} variant="soft" onPress={() => void home.refetch()} />
          </View>
        ) : (
          <>
            <HomeTiles tiles={home.data.tiles} />
            {inviteDismissed === false ? <InviteCard rewards={home.data.invite} onClose={dismissInvite} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  errorBox: { padding: spacing.lg, gap: spacing.md },
});
