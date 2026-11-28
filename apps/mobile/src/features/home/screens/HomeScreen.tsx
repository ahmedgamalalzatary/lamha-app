import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { useHome } from '../api/home';
import { BannerCarousel, BannerRail } from '../components/Banners';
import { HomeHeader } from '../components/HomeHeader';
import { HomeSections } from '../components/HomeSections';
import { HomeTiles, HomeTilesSkeleton } from '../components/HomeTiles';
import { InviteCard } from '../components/InviteCard';
import { LiveOrderStrip } from '../components/LiveOrderStrip';
import { OfferTiles } from '../components/OfferTiles';
import { UseAndSave } from '../components/UseAndSave';
import { useInviteDismissed } from '../hooks/invite-dismissed';

/**
 * The customer's الرئيسية in lamha's order (contract §8.2, L1): header with the address and search, the
 * order on its way, نقاطي and المحفظة, the tiles, the banner carousel, the invite card, "العروض
 * والكوبونات", the coloured store sections, then the rails.
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
            <Button label={t('common.retry')} variant="secondary" onPress={() => void home.refetch()} />
          </View>
        ) : (
          <>
            <LiveOrderStrip />
            <UseAndSave />
            <HomeTiles tiles={home.data.tiles} />
            <BannerCarousel banners={home.data.banners.filter((b) => b.place === 'carousel')} />
            {inviteDismissed === false ? <InviteCard rewards={home.data.invite} onClose={dismissInvite} /> : null}
            <OfferTiles />
            <HomeSections sections={home.data.sections} />
            {home.data.banners
              .filter((b) => b.place === 'rail')
              .map((b) => (
                <BannerRail key={b.id} banner={b} />
              ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  errorBox: { padding: spacing.lg, gap: spacing.md },
});
