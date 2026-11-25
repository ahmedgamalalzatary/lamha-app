import {
  Alexandria_400Regular,
  Alexandria_500Medium,
  Alexandria_600SemiBold,
  Alexandria_700Bold,
  useFonts,
} from '@expo-google-fonts/alexandria';
import { QueryClientProvider } from '@tanstack/react-query';
import { reloadAppAsync } from 'expo';
import { LocaleProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OfflineScreen } from '@/components/OfflineScreen';
import { toast, ToastHost } from '@/components/Toast';
import { session, useSession } from '@/core/auth/session';
import { isRTL, translate, useLocale } from '@/core/i18n';
import { localePreference, useLocalePersisted } from '@/core/i18n/locale';
import { prepareDirectionReload } from '@/core/i18n/native-direction';
import { queryClient } from '@/core/query';
import { colors } from '@/core/theme';

// Keep the orange splash until the font is ready and the stored session has been read.
void SplashScreen.preventAutoHideAsync();

async function restoreSessionAndLocale() {
  await session.restore();
  const generation = session.generation();
  await localePreference.restore(useSession.getState().user?.locale, () => generation === session.generation());
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Alexandria_400Regular,
    Alexandria_500Medium,
    Alexandria_600SemiBold,
    Alexandria_700Bold,
  });
  const status = useSession((s) => s.status);
  const locale = useLocale();
  const persisted = useLocalePersisted();
  const rtl = isRTL(locale);
  const [restored, setRestored] = useState(false);
  const ready = (fontsLoaded || fontError !== null) && restored;

  useEffect(() => {
    void restoreSessionAndLocale().then(() => setRestored(true));
  }, []);

  useEffect(() => {
    if (!restored) return;
    if (!persisted) toast.show(translate('account.languageStorageFailed', locale), 'error');
    if (Platform.OS === 'web') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
      return;
    }
    // Disable RTL for English even when the device itself is set to Arabic.
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    const matches = I18nManager.isRTL === rtl;
    if (!persisted && !matches) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const notify = () => {
      clearTimeout(timer);
      if (active && !matches) toast.show(translate('account.languageRestartFailed', locale), 'error');
    };
    void prepareDirectionReload(locale, matches).then((attempt) => {
      if (!active || matches) return;
      if (!attempt) {
        notify();
        return;
      }
      // A native reload can acknowledge the request without actually replacing this runtime.
      timer = setTimeout(notify, 2_500);
      return reloadAppAsync('App language changed');
    }).catch(notify);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [locale, persisted, restored, rtl]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={[StyleSheet.absoluteFill, { direction: rtl ? 'rtl' : 'ltr' }]}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <LocaleProvider direction={rtl ? 'rtl' : 'ltr'}>
            {status === 'offline' ? (
              <OfflineScreen onRetry={restoreSessionAndLocale} />
            ) : (
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
            )}
          </LocaleProvider>
          <ToastHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
