import type { DriverOffer } from '@tawsela/shared';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Vibration, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';
import { useDriverOffers, useDriverShift } from '../api/driver';
import { useDriverLive } from '../hooks/live';
import { OfferButtons, OfferFacts, useAnswerOffer, useNow } from './parts';

/** A ring for an offer: vibration only for now; the sound comes with notifications (Phase 16). */
const RING = [0, 500, 250, 500];

/** Mounted once in the driver area: the live connection and the offer popup over every tab. */
export function DriverLive() {
  useDriverLive();
  return <OfferPopup />;
}

/**
 * A new order pops up for every working delivery man at once [Owner, 2026-11-25]; the first to
 * accept takes it. It counts down the offer time (60 s); when nobody took it, it rings and shows
 * again, and ignoring it is never a skip. Closing it (back button) leaves it on الرئيسية until the
 * next round. [Open] Tawsilty's offer screen is not captured: it uses the store's popup look.
 */
function OfferPopup() {
  const t = useT();
  const shift = useDriverShift();
  const offers = useDriverOffers();
  const answer = useAnswerOffer();
  const list = offers.data ?? [];
  const now = useNow(list.length > 0);
  const seconds = shift.data?.offerSeconds ?? 60;
  const [closed, setClosed] = useState<ReadonlyMap<number, number>>(new Map());

  const roundOf = (o: DriverOffer) => Math.max(0, Math.floor((now - Date.parse(o.offeredAt)) / (seconds * 1000)));
  const offer = list.find((o) => closed.get(o.id) !== roundOf(o));
  const round = offer ? roundOf(offer) : -1;
  const shown = offer ? `${offer.id}:${round}` : null;

  // Rings when an offer shows, and again each time it comes back.
  useEffect(() => {
    if (shown) Vibration.vibrate(RING);
  }, [shown]);

  if (!offer) return null;
  const left = Math.ceil(seconds - ((now - Date.parse(offer.offeredAt)) / 1000 - round * seconds));
  const close = () => setClosed((m) => new Map(m).set(offer.id, round));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 1}>
            {t('driver.offerTitle', { code: offer.code })}
          </AppText>
          <AppText color={colors.ink2}>{t('driver.offerEnds', { seconds: Math.max(1, left) })}</AppText>
          <OfferFacts offer={offer} />
          <OfferButtons
            offer={offer}
            busy={answer.busy}
            onAccept={() => answer.accept(offer.id)}
            onSkip={() => {
              close();
              answer.skip(offer.id);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.bg, borderRadius: 4, padding: spacing.xl, gap: spacing.lg },
});
