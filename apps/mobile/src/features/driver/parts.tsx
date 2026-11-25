import { type DriverOffer, formatMoney } from '@tawsela/shared';
import { router } from 'expo-router';
import { MapPin, Store } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';
import { useAcceptOffer, useSkipOffer } from './api';

/** "8:30 PM" in Cairo time, as the slot list and the store's details read (Latin digits, §7). */
export const cairoTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' });

/** The time now, moving every `everyMs` while `on` (a countdown on screen); still otherwise. */
export function useNow(on: boolean, everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [on, everyMs]);
  return now;
}

/**
 * قبول and تخطي, from the popup or a card. Accepting opens the order; a skip may bring the warning
 * or the block (§10), shown at once (push comes with Phase 16). The answer is followed through
 * the promise: the card that was tapped leaves the list as it refreshes, before per-call callbacks
 * would run.
 */
export function useAnswerOffer() {
  const t = useT();
  const accept = useAcceptOffer();
  const skip = useSkipOffer();
  const failed = (e: unknown) => toast.show(errorMessage(e), 'error');
  return {
    busy: accept.isPending || skip.isPending,
    accept: (id: number) =>
      void accept
        .mutateAsync(id)
        .then(() => router.push(`/driver-order/${id}`))
        .catch(failed),
    skip: (id: number) =>
      void skip
        .mutateAsync(id)
        .then((r) => {
          if (r.outcome === 'warn') toast.show(t('driver.skipWarning', { count: r.skipsInRow }), 'error');
          if (r.outcome === 'block' && r.blockedUntil) toast.show(t('driver.blocked', { time: cairoTime(r.blockedUntil) }), 'error');
        })
        .catch(failed),
  };
}

/** The money and places of an offer: the store, where it goes, what he pays the store and collects. */
export function OfferFacts({ offer }: { offer: DriverOffer }) {
  const t = useT();
  const locale = useLocale();
  return (
    <View style={styles.facts}>
      <View style={styles.row}>
        <Store size={18} color={colors.primary} />
        <AppText weight="semibold" style={styles.grow}>
          {offer.store.area ? `${offer.store.name} - ${offer.store.area}` : offer.store.name}
        </AppText>
      </View>
      <View style={styles.row}>
        <MapPin size={18} color={colors.primary} />
        <AppText style={styles.grow}>
          {t('driver.deliverTo')}: {offer.area ?? '—'}
          {offer.distanceKm !== null ? ` · ${t('driver.distance', { km: offer.distanceKm.toFixed(1) })}` : ''}
        </AppText>
      </View>
      <View style={styles.row}>
        <AppText color={colors.ink2} style={styles.grow}>
          {t('driver.productsCount', { count: offer.count })}
        </AppText>
        <AppText weight="semibold">{formatMoney(offer.itemsTotal, locale)}</AppText>
      </View>
      <View style={styles.row}>
        <AppText weight="semibold" color={colors.primary} style={styles.grow}>
          {t('driver.payStore')}
        </AppText>
        <AppText weight="bold" color={colors.primary}>
          {formatMoney(offer.storeFromDriver, locale)}
        </AppText>
      </View>
      <View style={styles.row}>
        <AppText style={styles.grow}>{t('driver.collectCash')}</AppText>
        <AppText weight="bold">{formatMoney(offer.total, locale)}</AppText>
      </View>
      <View style={styles.row}>
        <AppText color={colors.ink2} style={styles.grow}>
          {t('driver.deliveryFee')}
        </AppText>
        <AppText color={colors.ink2}>{formatMoney(offer.deliveryFee, locale)}</AppText>
      </View>
    </View>
  );
}

/** A green قبول and an outlined تخطي, as the store's popup pairs its answers. */
export function OfferButtons({ offer, busy, onAccept, onSkip }: { offer: DriverOffer; busy: boolean; onAccept: () => void; onSkip: () => void }) {
  const t = useT();
  return (
    <View style={styles.buttons}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${t('driver.accept')} #${offer.code}`}
        disabled={busy}
        onPress={onAccept}
        style={[styles.button, styles.accept]}
      >
        <AppText weight="semibold" size={16} color={colors.bg}>
          {t('driver.accept')}
        </AppText>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${t('driver.skip')} #${offer.code}`}
        disabled={busy}
        onPress={onSkip}
        style={[styles.button, styles.skip]}
      >
        <AppText weight="semibold" size={16} color={colors.danger}>
          {t('driver.skip')}
        </AppText>
      </PressableScale>
    </View>
  );
}

/** An offer on الرئيسية: white card, the code in the dark-orange corner badge like the store's cards. */
export function OfferCard({ offer }: { offer: DriverOffer }) {
  const t = useT();
  const answer = useAnswerOffer();
  return (
    <View accessibilityLabel={t('driver.offerTitle', { code: offer.code })} style={styles.card}>
      <View style={styles.badge}>
        <AppText weight="semibold" size={15} color={colors.bg}>
          #{offer.code}
        </AppText>
      </View>
      <View style={styles.body}>
        <OfferFacts offer={offer} />
        <OfferButtons offer={offer} busy={answer.busy} onAccept={() => answer.accept(offer.id)} onSkip={() => answer.skip(offer.id)} />
      </View>
    </View>
  );
}

export const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  facts: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
  buttons: { flexDirection: 'row', gap: spacing.md },
  button: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.sm },
  accept: { backgroundColor: colors.success },
  skip: { borderWidth: 1, borderColor: colors.danger },
  card: { backgroundColor: colors.bg, borderRadius: radius.md, overflow: 'hidden', ...cardShadow },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary700,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomEndRadius: radius.lg,
  },
  body: { padding: spacing.lg, gap: spacing.md },
});
