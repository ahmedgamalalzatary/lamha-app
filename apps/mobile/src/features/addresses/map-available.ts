import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Whether the app can draw the map. Android's Google map needs GOOGLE_MAPS_API_KEY at build time
 * (app.config.ts) and crashes without it; iOS draws Apple's map. [Open] No key yet: Android shows a
 * stand-in and takes the phone's location as the spot.
 */
export function mapAvailable(): boolean {
  return Platform.OS === 'ios' || Constants.expoConfig?.extra?.googleMaps === true;
}

/**
 * The map's provider: Google on Android (react-native-maps' PROVIDER_GOOGLE), none on iOS, so Apple's
 * map draws there. Asking for Google on iOS throws, since the app sets up Google Maps for Android only.
 */
export function mapProvider(): 'google' | undefined {
  return Platform.OS === 'android' ? 'google' : undefined;
}
