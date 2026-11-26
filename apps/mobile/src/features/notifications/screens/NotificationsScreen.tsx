import type { AppNotification } from '@tawsela/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { useAgo } from '@/features/partner/components/parts';
import { notificationsApi, notificationsKey, useNotifications } from '../api/notifications';

/**
 * الإشعارات (contract §8.14, customer/account/notifications-empty-state.png): the white header with
 * the title and the back chevron, a pale grey page, and "لا توجد إشعارات — ستظهر هنا إشعاراتك عند
 * وصولها". [Open] The list's rows are not captured. Opening the screen marks them read [Derived].
 */
export function NotificationsScreen() {
  const t = useT();
  const queries = useQueryClient();
  const list = useNotifications();
  const unread = list.data?.unread ?? 0;

  useEffect(() => {
    if (unread === 0) return;
    // Shown once as unread, then read: the bell's dot goes.
    const timer = setTimeout(() => {
      void notificationsApi
        .read()
        .then(() => queries.invalidateQueries({ queryKey: notificationsKey }))
        .catch(() => undefined);
    }, 1500);
    return () => clearTimeout(timer);
  }, [unread, queries]);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.side} />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 1}>
          {t('notifications.title')}
        </AppText>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.side}>
          <DirectionalIcon icon={ChevronRight} size={26} color={colors.ink2} />
        </PressableScale>
      </View>
      {list.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : list.isError ? (
        <View style={styles.list}>
          <AppText color={colors.danger}>{errorMessage(list.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void list.refetch()} />
        </View>
      ) : list.data.items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyCircle}>
            <Bell size={30} color={colors.violet} />
          </View>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>
            {t('notifications.empty')}
          </AppText>
          <AppText color={colors.ink2}>{t('notifications.emptyMessage')}</AppText>
        </View>
      ) : (
        <FlatList
          data={list.data.items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />}
          renderItem={({ item }) => <Row item={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function Row({ item: n }: { item: AppNotification }) {
  const t = useT();
  const ago = useAgo();
  const path = n.path;
  return (
    <PressableScale
      accessibilityRole={path ? 'button' : undefined}
      accessibilityLabel={`${n.read ? '' : `${t('notifications.unread')} `}${n.title}`}
      disabled={!path}
      onPress={() => path && router.push(path as never)}
      style={styles.row}
    >
      <View style={styles.rowIcon}>
        <Bell size={20} color={colors.primary700} />
      </View>
      <View style={styles.grow}>
        <AppText weight="bold">{n.title}</AppText>
        <AppText color={colors.ink2}>{n.body}</AppText>
        <AppText size={fontSizes.caption} color={colors.ink2}>
          {ago(n.createdAt)}
        </AppText>
      </View>
      {n.read ? null : <View style={styles.dot} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  side: { width: sizes.iconLg, height: sizes.iconLg, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  skeleton: { height: 84, borderRadius: radius.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.violet50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.lg },
  rowIcon: { width: sizes.icon, height: sizes.icon, borderRadius: sizes.icon / 2, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: spacing.xs },
});
