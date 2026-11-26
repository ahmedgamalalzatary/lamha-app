import type { OrderRequest } from '@tawsela/shared';
import { Image } from 'expo-image';
import { Linking, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { mediaUrl } from '@/core/api/client';
import { useT, useTextStart } from '@/core/i18n';
import { colors, fonts, fontSizes, radius, spacing } from '@/core/theme';

/**
 * A pharmacy request on the store's side (contract §8.11): which card it came from, its photo (tap
 * opens it full size) and the customer's text. [Derived] Tawsilty's partner side is not captured.
 */
export function RequestDetails({ request }: { request: OrderRequest }) {
  const t = useT();
  const uri = mediaUrl(request.image);
  return (
    <View style={styles.wrap}>
      <AppText weight="bold" size={fontSizes.sectionTitle} color={colors.primary}>
        {t(`pharmacy.kind.${request.kind}`)}
      </AppText>
      {uri ? (
        <PressableScale accessibilityRole="imagebutton" accessibilityLabel={t('pharmacy.openPhoto')} onPress={() => void Linking.openURL(uri)}>
          <Image source={{ uri }} contentFit="cover" style={styles.photo} accessibilityIgnoresInvertColors />
        </PressableScale>
      ) : null}
      {request.text ? (
        <View style={styles.text}>
          <AppText weight="semibold">{t('pharmacy.writeTitle')}</AppText>
          <AppText size={fontSizes.listTitle}>{request.text}</AppText>
        </View>
      ) : null}
    </View>
  );
}

/** "سعر الطلب": the items price the pharmacy sets before قبول. */
export function PriceField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const t = useT();
  const textAlign = useTextStart();
  return (
    <View style={styles.price}>
      <AppText weight="bold">{t('pharmacy.priceLabel')}</AppText>
      <TextInput
        accessibilityLabel={t('pharmacy.priceLabel')}
        placeholder={t('pharmacy.pricePlaceholder')}
        placeholderTextColor={colors.ink2}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChange}
        style={[styles.input, { textAlign }]}
      />
      <AppText size={fontSizes.caption} color={colors.ink2}>{t('pharmacy.priceHint')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.input },
  text: { gap: spacing.xs, backgroundColor: colors.input, borderRadius: radius.sm, padding: spacing.md },
  price: { gap: spacing.xs },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.ink, borderRadius: radius.md, paddingHorizontal: spacing.md,
    fontFamily: fonts.regular, fontSize: fontSizes.listTitle, color: colors.ink },
});
