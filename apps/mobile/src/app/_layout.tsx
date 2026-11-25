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
import { localePreference } from '@/core/i18n/locale';
import { queryClient } from '@/core/query';
import { colors } from '@/core/theme';

// Keep the orange splash until the font is ready and the stored session has been read.
void SplashScreen.preventAutoHideAsync();

async function restoreSessionAndLocale() {
  await session.restore();
  await localePreference.restore(useSession.getState().user?.locale);
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
  const rtl = isRTL(locale);
  const [restored, setRestored] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);
  const directionPending = Platform.OS !== 'web' && I18nManager.isRTL !== rtl && !reloadFailed;
  const ready = (fontsLoaded || fontError !== null) && restored && !directionPending;

  useEffect(() => {
    void restoreSessionAndLocale().then(() => setRestored(true));
  }, []);

  useEffect(() => {
    if (!restored) return;
    if (Platform.OS === 'web') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
      return;
    }
    // Disable RTL for English even when the device itself is set to Arabic.
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    if (I18nManager.isRTL !== rtl) {
      // Native views and navigation read the direction when the JS runtime starts.
      void reloadAppAsync('App language changed').catch(() => {
        setReloadFailed(true);
        toast.show(translate('account.languageRestartFailed', locale), 'error');
      });
    }
  }, [locale, restored, rtl]);

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
