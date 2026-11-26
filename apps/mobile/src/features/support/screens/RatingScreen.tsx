import { useQueryClient } from '@tanstack/react-query';
import { isBadRating, type RatingTag, ratingProblem, ratingTagLabel, ratingTags, ratingWord, RATING_TEXT_LIMIT } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Info, Star, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { toast } from '@/components/Toast';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { useStillHere } from '@/core/hooks/useStillHere';
import { useLocale, useT, useTextStart } from '@/core/i18n';
import { colors, fonts, fontSizes, radius, spacing } from '@/core/theme';
import { ordersKey, useMyOrder } from '@/features/orders/api/orders';
import { supportApi } from '../api/support';

/**
 * The rating screen (contract §8.8, customer/orders/rating-one-star-problem-chips-tell-more.jpg): ✕ on
 * a soft beige top, the store's logo, "كيف كان طلبك من <store>؟", five stars with their word. 1 to 3
 * stars asks "ما هي المشكلة التي واجهتها مع طلبك؟" with Tawsilty's chips and the red hint until one is
 * picked [Owner: 1-3 is bad]; 4 and 5 show the good chips [Open: not captured]. "أخبرنا المزيد" is
 * always there; "أكمل" stays grey until the rating is complete.
 */
export function RatingScreen() {
  const t = useT();
  const locale = useLocale();
  const textStart = useTextStart();
  const queries = useQueryClient();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const orderId = Number(id);
  const order = useMyOrder(orderId);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<RatingTag[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const stillHere = useStillHere();

  const input = { stars, tags, text };
  const ready = stars > 0 && ratingProblem(input) === null;
  const store = order.data?.store;
  const logo = mediaUrl(store?.logo ?? null);

  const close = () => {
    // ✕ on the popup: not asked again for this order.
    if (from === 'prompt') void supportApi.skip(orderId).catch(() => undefined);
    router.back();
  };

  const pick = (n: number) => {
    setStars(n);
    // Chips of the other kind go when the stars cross between bad and good.
    if (isBadRating(n) !== isBadRating(stars || n)) setTags([]);
  };

  async function send() {
    setBusy(true);
    try {
      await supportApi.rate(orderId, { stars, tags, text: text.trim() });
      void queries.invalidateQueries({ queryKey: ordersKey });
      toast.show(t('rating.thanks'));
      if (stillHere()) router.back();
    } catch (e) {
      if (stillHere()) toast.show(errorMessage(e), 'error');
    } finally {
      if (stillHere()) setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SafeAreaView edges={['top']} style={styles.top}>
          <PressableScale accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
            <X size={26} color={colors.ink} />
          </PressableScale>
          <View style={styles.logo}>{logo ? <Image source={{ uri: logo }} style={styles.logoImage} accessibilityIgnoresInvertColors /> : null}</View>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle + 4} style={styles.question}>
            {store ? t('rating.question', { store: store.name }) : ''}
          </AppText>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <PressableScale
                key={n}
                accessibilityRole="button"
                accessibilityLabel={t('rating.star', { count: n })}
                accessibilityState={{ selected: n === stars }}
                onPress={() => pick(n)}
                scaleTo={0.85}
              >
                <Star size={44} color={n <= stars ? colors.primary : colors.starEmpty} fill={n <= stars ? colors.primary : 'transparent'} strokeWidth={1.6} />
              </PressableScale>
            ))}
          </View>
          <AppText size={fontSizes.listTitle + 2} weight="semibold" color={colors.ink2} style={styles.word}>
            {stars ? ratingWord(stars, locale) : ' '}
          </AppText>
        </SafeAreaView>

        {stars ? (
          <View style={styles.body}>
            <AppText weight="bold" size={fontSizes.sectionTitle + 1}>
              {isBadRating(stars) ? t('rating.problem') : t('rating.liked')}
            </AppText>
            <View style={styles.chips}>
              {ratingTags(stars).map((tag) => {
                const on = tags.includes(tag);
                return (
                  <PressableScale
                    key={tag}
                    accessibilityRole="checkbox"
                    accessibilityLabel={ratingTagLabel(tag, locale)}
                    accessibilityState={{ checked: on }}
                    onPress={() => setTags(on ? tags.filter((x) => x !== tag) : [...tags, tag])}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <AppText size={fontSizes.listTitle + 1} color={on ? colors.primary700 : colors.ink2}>
                      {ratingTagLabel(tag, locale)}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
            {isBadRating(stars) && tags.length === 0 ? (
              <View style={styles.hint}>
                <Info size={18} color={colors.danger} />
                <AppText color={colors.danger}>{t('rating.pickReason')}</AppText>
              </View>
            ) : null}
            <AppText weight="bold" size={fontSizes.sectionTitle + 1} style={styles.more}>
              {t('rating.tellMore')}
            </AppText>
            <TextInput
              accessibilityLabel={t('rating.tellMore')}
              value={text}
              onChangeText={setText}
              maxLength={RATING_TEXT_LIMIT}
              multiline
              style={[styles.input, { textAlign: textStart }]}
            />
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t('rating.done')} disabled={!ready} loading={busy} onPress={() => void send()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xl },
  top: { backgroundColor: colors.bgWarm, alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  close: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 80, height: 80, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.input },
  logoImage: { width: '100%', height: '100%' },
  question: { textAlign: 'center' },
  // The first star on the reading start, as in the photo (right in Arabic).
  stars: { flexDirection: 'row', gap: spacing.lg },
  word: { textAlign: 'center' },
  body: { padding: spacing.xl, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chip: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  more: { marginTop: spacing.md },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: fontSizes.listTitle,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
});
