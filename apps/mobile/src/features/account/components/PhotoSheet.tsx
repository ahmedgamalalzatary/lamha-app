import * as ImagePicker from 'expo-image-picker';
import { Camera, Images, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { PressableScale } from '@/components/PressableScale';
import { toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { meApi } from '../api/me';

/** A square crop, made small enough to send quickly; the API stores it as JPEG. */
const PICK: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true };

/** Tawsilty's "اختر صورة" sheet (profile-avatar-choose-photo-sheet): "التقاط صورة" or "من المعرض". */
export function PhotoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();

  const pick = useSubmit(async (from: 'camera' | 'gallery') => {
    const allowed =
      from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!allowed.granted) {
      toast.show(t('profile.photoDenied'));
      return;
    }
    const result = from === 'camera' ? await ImagePicker.launchCameraAsync(PICK) : await ImagePicker.launchImageLibraryAsync(PICK);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset?.base64) return;
    onClose();
    session.setUser(await meApi.setAvatar(asset.base64));
    toast.show(t('profile.photoSaved'), 'success');
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('profile.choosePhoto')}>
      <View style={styles.row}>
        <Choice icon={Camera} label={t('profile.takePhoto')} onPress={() => void pick.run('camera')} />
        <Choice icon={Images} label={t('profile.fromGallery')} onPress={() => void pick.run('gallery')} />
      </View>
    </BottomSheet>
  );
}

function Choice({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.choice}>
      <View style={styles.circle}>
        <Icon size={34} color={colors.primary} />
      </View>
      <AppText size={17}>{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 72, paddingVertical: spacing.xl },
  choice: { alignItems: 'center', gap: spacing.lg },
  circle: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
});
