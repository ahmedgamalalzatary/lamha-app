import { type LatLng, shortPlusCode } from '@tawsela/shared';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Layers, LocateFixed, LocateOff, MapPin, X, ZoomIn } from 'lucide-react-native';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useAddresses } from '../api/addresses';
import { mapAvailable, mapProvider } from '../map-available';
import { PIN_ZOOM, usePickedSpot, zoomOf } from '../picked-spot';

/** Egypt, as Tawsilty opens before it knows where you are (map-picker-location-off-banner.png). */
const EGYPT: Region = { latitude: 30.4, longitude: 31.2, latitudeDelta: 14, longitudeDelta: 14 };
/** Close enough to confirm. */
const STREET = 0.003;
const near = (p: LatLng): Region => ({ latitude: p.lat, longitude: p.lng, latitudeDelta: STREET, longitudeDelta: STREET });

/** The area the phone names for a spot ("Qesm Al Fayoum"), or '' when it cannot. */
async function areaOf(p: LatLng): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng });
    return place?.district ?? place?.subregion ?? place?.city ?? '';
  } catch {
    return '';
  }
}

const keyOf = (p: LatLng) => `${p.lat},${p.lng}`;

/**
 * Tawsilty's map picker (contract §8.9): the layers button, ✕ ("تخطي" before the first address), the
 * banner while location is off with "تفعيل", the centre pin with "قرّب الخريطة لتحديد الموقع بدقة", the
 * locate button, and the "موقع التوصيل" card: the plus code, the zoom hint and "تأكيد الموقع", off until
 * zoomed in enough. `from=form` hands the spot back to the address form; otherwise it opens a new one.
 */
export function MapPickerScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const addresses = useAddresses();
  const start = from === 'form' ? usePickedSpot.getState().spot : null;
  const map = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(start ? near(start) : EGYPT);
  /** The area named for a spot; it arrives later than the spot, so it is kept with the spot it names. */
  const [place, setPlace] = useState<{ key: string; area: string } | null>(null);
  const [locationOn, setLocationOn] = useState(true);
  const [satellite, setSatellite] = useState(false);
  /** The customer has moved the map by hand: a location fix that arrives later leaves it there (review F25). */
  const touched = useRef(false);
  const withMap = mapAvailable();

  const spot = { lat: region.latitude, lng: region.longitude };
  const zoomedIn = zoomOf(region.longitudeDelta) >= PIN_ZOOM;
  // "8RCP+FJM، Qesm Al Fayoum": the plus code always from the pin itself, the area once named (review F80).
  const area = place?.key === keyOf(spot) ? place.area : '';
  const label = area ? `${shortPlusCode(spot.lat, spot.lng)}، ${area}` : shortPlusCode(spot.lat, spot.lng);

  const nameArea = useCallback((p: LatLng) => {
    void areaOf(p).then((name) => setPlace({ key: keyOf(p), area: name }));
  }, []);

  const moveTo = useCallback(
    (r: Region, details?: { isGesture?: boolean }) => {
      if (details?.isGesture) touched.current = true;
      setRegion(r);
      nameArea({ lat: r.latitude, lng: r.longitude });
    },
    [nameArea],
  );

  /**
   * Flies to the phone's location; false when location is off, refused or cannot be found. `onOpen`:
   * the automatic try on opening, which never moves a map the customer has already moved.
   */
  const locate = useCallback(
    async (onOpen = false) => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted || !(await Location.hasServicesEnabledAsync())) {
          setLocationOn(false);
          return false;
        }
        setLocationOn(true);
        const { coords } = await Location.getCurrentPositionAsync({});
        if (onOpen && touched.current) return true;
        const there = near({ lat: coords.latitude, lng: coords.longitude });
        if (map.current) map.current.animateToRegion(there);
        else moveTo(there);
        return true;
      } catch {
        // No fix (indoors, the service failed): the customer places the pin by hand.
        setLocationOn(false);
        return false;
      }
    },
    [moveTo],
  );

  useEffect(() => {
    nameArea({ lat: region.latitude, lng: region.longitude });
    // Where the phone is, unless the form handed a spot over. Asked after the first render.
    if (!start) void Promise.resolve().then(() => locate(true));
    // Back from the phone's settings with location now on: hide the banner (review F25).
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void locate(true);
    });
    return () => sub.remove();
    // Once, on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** "تفعيل": asks for the location, or opens the phone's settings when it can no longer ask. */
  const enable = async () => {
    const answer = await Location.requestForegroundPermissionsAsync();
    if (!answer.granted && !answer.canAskAgain) {
      void Linking.openSettings();
      return;
    }
    if (answer.granted && !(await Location.hasServicesEnabledAsync())) void Linking.openSettings();
    await locate();
  };

  const confirm = () => {
    usePickedSpot.setState({ spot: { ...spot, label } });
    if (from === 'form') router.back();
    else router.replace('/address/new');
  };

  const firstAddress = addresses.data?.length === 0;

  return (
    <View style={styles.screen}>
      {withMap ? (
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          provider={mapProvider()}
          initialRegion={region}
          mapType={satellite ? 'hybrid' : 'standard'}
          onRegionChangeComplete={moveTo}
          // isGesture is Google-only; a drag is how Apple Maps (iOS) tells a move by hand.
          onPanDrag={() => (touched.current = true)}
          showsUserLocation={locationOn}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.standIn]}>
          <AppText color={colors.ink2} style={styles.centred}>
            {t('map.noMap')}
          </AppText>
        </View>
      )}

      {/* The centre pin, with the zoom tip over it. */}
      <View pointerEvents="none" style={styles.pinWrap}>
        {zoomedIn ? null : (
          <View style={styles.tip}>
            <AppText color={colors.bg} size={fontSizes.body}>
              {t('map.zoomTip')}
            </AppText>
          </View>
        )}
        <View style={styles.pinHead}>
          <View style={styles.pinDot} />
        </View>
        <View style={styles.pinStem} />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topRow}>
          <Round label={t('map.layers')} onPress={() => setSatellite((s) => !s)}>
            <Layers size={24} color={colors.ink} />
          </Round>
          {firstAddress ? (
            <PressableScale accessibilityRole="button" accessibilityLabel={t('map.skip')} onPress={() => router.back()} style={styles.skip}>
              <AppText weight="bold" size={fontSizes.sectionTitle}>
                {t('map.skip')}
              </AppText>
            </PressableScale>
          ) : (
            <Round label={t('common.close')} onPress={() => router.back()}>
              <X size={24} color={colors.ink} />
            </Round>
          )}
        </View>
        {locationOn ? null : (
          <View style={styles.banner}>
            <LocateOff size={26} color={colors.primary} />
            <AppText style={styles.bannerText}>{t('map.locationOff')}</AppText>
            <PressableScale accessibilityRole="button" accessibilityLabel={t('map.enable')} onPress={() => void enable()} hitSlop={8}>
              <AppText weight="bold" color={colors.primary}>
                {t('map.enable')}
              </AppText>
            </PressableScale>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        <View style={styles.locateRow}>
          <Round label={t('map.locate')} onPress={() => void (locationOn ? locate() : enable())}>
            <LocateFixed size={26} color={colors.primary} />
          </Round>
        </View>
        <View style={[styles.card, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppText color={colors.ink2}>{t('map.deliverySpot')}</AppText>
          <View style={styles.spotRow}>
            <View style={styles.spotIcon}>
              <MapPin size={22} color={colors.primary} fill={colors.primary} />
            </View>
            <AppText weight="bold" size={fontSizes.listTitle} style={styles.flex}>
              {label}
            </AppText>
          </View>
          {zoomedIn ? null : (
            <View style={styles.hint}>
              <ZoomIn size={18} color={colors.ink2} />
              <AppText color={colors.ink2} size={fontSizes.body}>
                {t('map.zoomHint')}
              </AppText>
            </View>
          )}
          {/* Without a map nothing zooms: the phone's location, once found, is close enough. */}
          <Button label={t('map.confirm')} disabled={!zoomedIn} onPress={confirm} />
        </View>
      </View>
    </View>
  );
}

function Round({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.92} style={styles.round}>
      {children}
    </PressableScale>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  standIn: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, backgroundColor: colors.input },
  centred: { textAlign: 'center' },
  flex: { flex: 1 },
  top: { position: 'absolute', top: 0, start: 0, end: 0, paddingHorizontal: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  round: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', ...shadow },
  skip: { height: 56, paddingHorizontal: spacing.xl, borderRadius: 28, backgroundColor: colors.bg, justifyContent: 'center', ...shadow },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  bannerText: { flex: 1 },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  tip: { backgroundColor: '#1D2333', borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginBottom: spacing.md },
  pinHead: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#CC5A00', alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bg },
  pinStem: { width: 3, height: 18, backgroundColor: '#CC5A00' },
  bottom: { position: 'absolute', bottom: 0, start: 0, end: 0 },
  locateRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.lg },
  card: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg + 8, borderTopRightRadius: radius.lg + 8, padding: spacing.xl, gap: spacing.lg },
  spotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spotIcon: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
