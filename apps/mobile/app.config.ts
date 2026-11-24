import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Contract §5: one .env at the repo root for every app. Expo only reads .env from its own folder,
// so load the root file here, before Metro inlines EXPO_PUBLIC_* vars. CI sets them itself.
loadEnv({ path: path.resolve(__dirname, '../../.env'), quiet: true });

/**
 * The app's identity, in one place. Every value here is a PLACEHOLDER until the client decides
 * (contract §15.1 #8). Change it here only; the builds and the stores read it from here.
 *
 * `id` becomes the Android package and the iOS bundle ID. It cannot change once the app is
 * published on a store.
 */
const IDENTITY = {
  name: 'Tawsela',
  nameAr: 'توصيلة',
  slug: 'tawsela',
  scheme: 'tawsela',
  id: 'com.placeholder.tawsela',
  /** Splash and adaptive-icon background (Tawsilty's primary orange, contract §6.1). */
  brandColor: '#F68B1D',
} as const;

/** Shown in the store and in Settings > About. Raise it for each store release. */
const VERSION = '1.0.0';

/**
 * The store build number: Android's versionCode and iOS's buildNumber. CI sets APP_BUILD_NUMBER to
 * main's commit count (store builds run from main only), so each upload is higher than the last;
 * local builds use 1. Play takes whole numbers from 1 to 2,100,000,000; anything else stops the
 * build here rather than at the store (review F56, as in realestate). Read when the config is.
 */
function buildNumber(): number {
  const raw = process.env.APP_BUILD_NUMBER;
  if (raw === undefined || raw === '') return 1;
  const n = Number(raw);
  if (!/^\d+$/.test(raw) || n < 1 || n > 2_100_000_000) throw new Error(`APP_BUILD_NUMBER must be a whole number from 1 to 2100000000, not "${raw}"`);
  return n;
}

/** Google Maps for Android (contract §8.9), from the root .env or a CI secret. Not a public value. */
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IDENTITY.name,
  slug: IDENTITY.slug,
  scheme: IDENTITY.scheme,
  version: VERSION,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: IDENTITY.id,
    buildNumber: String(buildNumber()),
    supportsTablet: false,
    infoPlist: {
      CFBundleDisplayName: IDENTITY.name,
      CFBundleDevelopmentRegion: 'ar',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: IDENTITY.id,
    versionCode: buildNumber(),
    adaptiveIcon: {
      backgroundColor: IDENTITY.brandColor,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // [Open] No key yet (contract §8.9): without one the app shows a stand-in instead of the map.
    ...(GOOGLE_MAPS_API_KEY ? { config: { googleMaps: { apiKey: GOOGLE_MAPS_API_KEY } } } : {}),
  },
  web: {
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: IDENTITY.brandColor,
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    // Arabic RTL from the first launch (contract §7). The English switch (LTR) comes with the account screen.
    ['expo-localization', { supportsRTL: true, forcesRTL: true }],
    'expo-sharing',
    ['expo-location', { locationWhenInUsePermission: 'توصيلة تستخدم موقعك لتحديد عنوان التوصيل على الخريطة.' }],
    'expo-asset',
    './plugins/with-release-signing.js',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    nameAr: IDENTITY.nameAr,
    /** The map picker draws Google's map only with a key (src/features/addresses/map-available.ts). */
    googleMaps: Boolean(GOOGLE_MAPS_API_KEY),
  },
});
