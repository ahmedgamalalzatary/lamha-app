import {
  Alexandria_400Regular,
  Alexandria_500Medium,
  Alexandria_600SemiBold,
  Alexandria_700Bold,
  useFonts,
} from '@expo-google-fonts/alexandria';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OfflineScreen } from '@/components/OfflineScreen';
import { ToastHost } from '@/components/Toast';
import { session, useSession } from '@/core/auth/session';
import { DEFAULT_LOCALE, isRTL } from '@/core/i18n';
import { queryClient } from '@/core/query';
import { colors } from '@/core/theme';

// Keep the orange splash until the font is ready and the stored session has been read.
void SplashScreen.preventAutoHideAsync();

// Native builds are RTL from the first launch (expo-localization forcesRTL); this keeps it so in Expo Go.
I18nManager.allowRTL(true);
I18nManager.forceRTL(isRTL(DEFAULT_LOCALE));

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Alexandria_400Regular,
    Alexandria_500Medium,
    Alexandria_600SemiBold,
    Alexandria_700Bold,
  });
  const status = useSession((s) => s.status);
  const ready = (fontsLoaded || fontError !== null) && status !== 'loading';

  useEffect(() => {
    void session.restore();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!fontsLoaded && fontError === null) return null;

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          {status === 'offline' ? (
            <OfflineScreen onRetry={session.restore} />
          ) : (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
          )}
          <ToastHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
