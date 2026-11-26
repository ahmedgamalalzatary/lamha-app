import { PHARMACY_REQUEST_KINDS, PHARMACY_REQUEST_TEXT_LIMIT, type PharmacyRequestKind, requestComplete } from '@tawsela/shared';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Images, type LucideIcon, Pencil, X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT, useTextStart } from '@/core/i18n';
import { colors, fonts, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { pharmacyApi, requestCheckout } from '../api';

/** Sharp enough to read a prescription; the API keeps it at 1600 px at most. */
const PICK: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };

/**
 * "الروشتة" (contract §8.11, prescription-request-photo-or-text): "أضف صورة الروشتة أو المنتج الذي
 * تريده" with the camera box, "أو", "اكتب طلبك" and its text area, then "التالي". Neither a photo nor a
 * text: the red toast "يرجى رفع صورة او كتابة طلبك". "التالي" sends the photo and opens إتمام الدفع.
 * [Open] The "صورة المنتج" card's screen title is not captured; it reads "صورة المنتج".
 */
export function RequestScreen() {
  const t = useT();
  const textAlign = useTextStart();
  const params = useLocalSearchParams<{ pharmacy: string; kind: string }>();
  const pharmacy = Number(params.pharmacy);
  const kind: PharmacyRequestKind = PHARMACY_REQUEST_KINDS.includes(params.kind as PharmacyRequestKind) ? (params.kind as PharmacyRequestKind) : 'prescription';
  const [photo, setPhoto] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [choosing, setChoosing] = useState(false);

  const pick = useSubmit(async (from: 'camera' | 'gallery') => {
    const allowed = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!allowed.granted) {
      toast.show(t('profile.photoDenied'));
      return;
    }
    const result = from === 'camera' ? await ImagePicker.launchCameraAsync(PICK) : await ImagePicker.launchImageLibraryAsync(PICK);
    const asset = result.canceled ? undefined : result.assets[0];
    setChoosing(false);
    if (asset) setPhoto(asset.uri);
  });

  const next = useSubmit(async () => {
    if (!requestComplete({ image: photo, text })) {
      toast.show(t('pharmacy.missing'), 'error');
      return;
    }
    try {
      const image = photo ? (await pharmacyApi.upload(photo)).url : null;
      router.push(requestCheckout({ pharmacy, kind, image, text }));
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle} style={styles.title}>
          {t(`pharmacy.requestTitle.${kind}`)}
        </AppText>
        <View style={styles.side} />
      </View>
      <KeyboardAvoidingView style={styles.grow} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.prompt}>
            <AppText size={fontSizes.listTitle}>{t('pharmacy.addPhoto')}</AppText>
          </View>
          {photo ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photo }} contentFit="cover" style={styles.photo} accessibilityIgnoresInvertColors />
              <PressableScale accessibilityRole="button" accessibilityLabel={t('pharmacy.removePhoto')} onPress={() => setPhoto(null)} style={styles.remove}>
                <X size={16} color={colors.bg} />
              </PressableScale>
            </View>
          ) : (
            <PressableScale accessibilityRole="button" accessibilityLabel={t('pharmacy.choosePhoto')} onPress={() => setChoosing(true)} style={styles.camera}>
              <Camera size={30} color={colors.primary} />
            </PressableScale>
          )}

          <View style={styles.or}>
            <View style={styles.rule} />
            <AppText color={colors.ink2}>{t('pharmacy.or')}</AppText>
            <View style={styles.rule} />
          </View>

          <View style={styles.write}>
            <Pencil size={26} color={colors.primary} />
            <AppText weight="bold" size={fontSizes.listTitle + 1}>{t('pharmacy.writeTitle')}</AppText>
            <AppText color={colors.ink2} style={styles.centred}>{t('pharmacy.writeHint')}</AppText>
          </View>
          <TextInput
            accessibilityLabel={t('pharmacy.writeTitle')}
            placeholder={t('pharmacy.writePlaceholder')}
            placeholderTextColor={colors.ink2}
            value={text}
            onChangeText={setText}
            maxLength={PHARMACY_REQUEST_TEXT_LIMIT}
            multiline
            style={[styles.input, { textAlign }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.footer}>
        <Button label={t('pharmacy.next')} loading={next.busy} onPress={() => void next.run()} />
      </View>
      <BottomSheet visible={choosing} onClose={() => setChoosing(false)} title={t('pharmacy.choosePhoto')}>
        <View style={styles.choices}>
          <Choice icon={Camera} label={t('pharmacy.takePhoto')} onPress={() => void pick.run('camera')} />
          <Choice icon={Images} label={t('pharmacy.fromGallery')} onPress={() => void pick.run('gallery')} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

/** "التقط صورة" and "اختر من المعرض" (prescription-choose-photo-sheet): two soft orange boxes. */
function Choice({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.choice}>
      <Icon size={30} color={colors.primary} />
      <AppText weight="semibold" color={colors.primary}>{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grow: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  title: { flex: 1, textAlign: 'center' },
  side: { width: sizes.iconLg },
  body: { padding: spacing.lg, gap: spacing.lg },
  prompt: { borderWidth: 1, borderColor: colors.primary400, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  camera: { alignSelf: 'flex-end', width: 84, height: 76, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: colors.ink2, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  photoWrap: { alignSelf: 'flex-end' },
  photo: { width: 120, height: 150, borderRadius: radius.md, backgroundColor: colors.input },
  remove: { position: 'absolute', top: spacing.xs, end: spacing.xs, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.pillDark, alignItems: 'center', justifyContent: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.ink2 },
  write: { alignItems: 'center', gap: spacing.sm },
  centred: { textAlign: 'center' },
  input: { minHeight: 160, borderWidth: 1, borderColor: colors.ink2, borderRadius: radius.lg, padding: spacing.lg,
    fontFamily: fonts.regular, fontSize: fontSizes.listTitle, color: colors.ink, textAlignVertical: 'top' },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  choices: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  choice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, minHeight: 110, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary100, backgroundColor: colors.primary50 },
});
