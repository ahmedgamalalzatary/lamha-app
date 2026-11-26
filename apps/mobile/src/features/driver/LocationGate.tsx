import * as Location from 'expo-location';
import { LocateFixed, RotateCw, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, shadows, spacing } from '@/core/theme';

async function locationOn(): Promise<boolean> {
  try {
    const [permission, services] = await Promise.all([Location.getForegroundPermissionsAsync(), Location.hasServicesEnabledAsync()]);
    return permission.granted && services;
  } catch {
    return false;
  }
}

/**
 * Whether the app may read the phone's location now: the permission and the location service.
 * Read again whenever the app comes back to the front (from the phone's settings). null while
 * the first check runs.
 */
export function useLocationOn() {
  const [on, setOn] = useState<boolean | null>(null);
  const mounted = useRef(true);
  const check = useCallback(async () => {
    const now = await locationOn();
    if (mounted.current) setOn(now);
    return now;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [check]);

  return { on, check };
}

/** Ask for the permission, then for the location service; the phone's settings when it can't ask. */
async function turnOn() {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) {
    permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain) await Linking.openSettings();
      return;
    }
  }
  if (await Location.hasServicesEnabledAsync()) return;
  try {
    // Android shows its own "turn on location" dialog.
    await Location.enableNetworkProviderAsync();
  } catch {
    // Refused, or not on this phone.
  }
  if (Platform.OS !== 'android' && !(await Location.hasServicesEnabledAsync())) await Linking.openSettings();
}

/**
 * الرئيسية with the location off (driver/driver-home-location-off-enable-location.jpg): "يرجى تفعيل
 * الموقع", its line and the orange "تفعيل الموقع" with ↻, which checks again and otherwise opens the
 * small dialog (driver-home-location-service-popup.jpg): ✕ and the outlined "تفعيل خدمة الموقع".
 */
export function LocationGate({ check }: { check: () => Promise<boolean> }) {
  const t = useT();
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    const on = await check();
    setBusy(false);
    if (!on) setDialog(true);
  }

  async function enable() {
    setDialog(false);
    await turnOn();
    await check();
  }

  return (
    <View style={styles.screen}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle} style={styles.centred}>
        {t('driver.locationTitle')}
      </AppText>
      <AppText color={colors.ink2} size={fontSizes.listTitle + 1} style={styles.centred}>
        {t('driver.locationBody')}
      </AppText>
      <Button label={t('driver.locationButton')} icon={RotateCw} loading={busy} onPress={() => void retry()} style={styles.button} />

      <Modal visible={dialog} transparent animationType="fade" onRequestClose={() => setDialog(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12} onPress={() => setDialog(false)} style={styles.close}>
              <X size={26} color={colors.ink} />
            </Pressable>
            <PressableScale accessibilityRole="button" accessibilityLabel={t('driver.locationService')} onPress={() => void enable()} style={styles.service}>
              <LocateFixed size={24} color={colors.primary} />
              <AppText weight="semibold" size={fontSizes.listTitle + 1} color={colors.primary}>
                {t('driver.locationService')}
              </AppText>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  centred: { textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: spacing.md },
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.backdrop },
  dialog: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, ...shadows.card },
  close: { alignSelf: 'flex-start' },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
});
