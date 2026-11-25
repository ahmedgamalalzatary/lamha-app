import { Platform } from 'react-native';
import { mapProvider } from '@/features/addresses/map-available';

describe('mapProvider (CodeRabbit: iOS draws Apple Maps)', () => {
  it("asks for Google Maps only on Android; iOS leaves the provider unset, so Apple's map draws", () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(mapProvider()).toBe('google'); // react-native-maps' PROVIDER_GOOGLE
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(mapProvider()).toBeUndefined();
  });
});
