import { TICKET_TEXT_LIMIT, ticketProblem, type TicketType } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Lightbulb, MessageSquareText } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { useStillHere } from '@/core/hooks/useStillHere';
import { useT, useTextStart } from '@/core/i18n';
import { colors, fonts, fontSizes, spacing } from '@/core/theme';
import { supportApi } from '../api/support';

/**
 * تقديم شكوى and تقديم اقتراح (contract §8.14, customer/account/complaint-general-form.png and
 * suggestion-form.png): the arrow and the title, an illustration [Open: Tawsilty's drawings are not
 * ours; an icon stands in], "ما هو شكواك" in orange, the underlined field and the orange "ارسال".
 * About a past order the question names it: "ما هو شكواك لطلب رقم 413600#"
 * (driver/driver-complaint-for-order-number.jpg).
 */
export function TicketScreen() {
  const t = useT();
  const textStart = useTextStart();
  const params = useLocalSearchParams<{ type: string; orderId?: string; code?: string }>();
  const type: TicketType = params.type === 'suggestion' ? 'suggestion' : 'complaint';
  const orderId = type === 'complaint' && params.orderId ? Number(params.orderId) : undefined;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const stillHere = useStillHere();
  const Icon = type === 'complaint' ? MessageSquareText : Lightbulb;

  async function send() {
    setBusy(true);
    try {
      await supportApi.ticket({ type, orderId, text: text.trim() });
      toast.show(t(type === 'complaint' ? 'support.complaintSent' : 'support.suggestionSent'));
      if (stillHere()) router.back();
    } catch (e) {
      if (stillHere()) toast.show(errorMessage(e), 'error');
    } finally {
      if (stillHere()) setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle}>
          {t(type === 'complaint' ? 'support.complaintTitle' : 'support.suggestionTitle')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.art}>
          <Icon size={96} color={colors.primary} strokeWidth={1.4} />
        </View>
        <AppText size={fontSizes.sectionTitle + 1} color={colors.primary700} style={styles.centred}>
          {orderId !== undefined && params.code
            ? t('support.complaintQuestionOrder', { code: params.code })
            : t(type === 'complaint' ? 'support.complaintQuestion' : 'support.suggestionQuestion')}
        </AppText>
        <View style={styles.field}>
          <AppText size={fontSizes.listTitle + 1}>{t(type === 'complaint' ? 'support.complaintLabel' : 'support.suggestionLabel')}</AppText>
          <TextInput
            accessibilityLabel={t(type === 'complaint' ? 'support.complaintLabel' : 'support.suggestionLabel')}
            placeholder={t(type === 'complaint' ? 'support.complaintHint' : 'support.suggestionHint')}
            placeholderTextColor={colors.ink2}
            value={text}
            onChangeText={setText}
            maxLength={TICKET_TEXT_LIMIT}
            multiline
            style={[styles.input, { textAlign: textStart }]}
          />
        </View>
        <Button label={t('support.send')} disabled={ticketProblem(text) !== null} loading={busy} onPress={() => void send()} style={styles.send} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  content: { padding: spacing.xl, gap: spacing.xl },
  art: { alignItems: 'center', paddingVertical: spacing.lg },
  centred: { textAlign: 'center' },
  field: { gap: spacing.md },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineStrong,
    paddingVertical: spacing.md,
    minHeight: 64,
    fontFamily: fonts.regular,
    fontSize: fontSizes.listTitle + 1,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  send: { marginHorizontal: spacing.xxl },
});
