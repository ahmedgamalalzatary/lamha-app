import { ADDRESS_TYPES, type AddressError, type AddressType, addressErrors, isEgyptianMobile, normalizePhone } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Briefcase, Building2, CircleCheck, CircleX, House, type LucideIcon, MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Switch, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { TextField } from '@/components/TextField';
import { session, useSession } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { type TranslationKey, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useAddresses, useAddressActions, useZoneCheck } from '../api/addresses';
import { chooseAddress } from '../chosen-address';
import { mapAvailable, mapProvider } from '../map-available';
import { usePickedSpot } from '../picked-spot';

const TYPE_ICONS: Record<AddressType, LucideIcon> = { apartment: Building2, office: Briefcase, villa: House };

/**
 * Tawsilty's "عنوان جديد" / "تعديل العنوان" (new-address-form-filled.png, edit-address-form-top.png): the
 * small map, "الموقع" with "تعديل" and "التوصيل متاح لهذا الموقع", the type chips شقة · مكتب · فيلا, the
 * fields, the default switch (set by itself on the first address) and "حفظ العنوان". The landmark is
 * required: "يرجى إدخال علامة مميزة للعنوان". A new address is delivered to at once [Derived].
 */
export function AddressFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id === undefined || id === 'new' ? undefined : Number(id);
  const t = useT();
  const insets = useSafeAreaInsets();
  const addresses = useAddresses();
  if (editId === undefined) return <AddressForm editId={editId} />;
  // Editing fills the fields from the saved address: wait for it, and say so when it fails or is gone (review F24).
  if (addresses.data?.some((a) => a.id === editId)) return <AddressForm editId={editId} />;
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <BackButton />
        <AppText weight="bold" size={fontSizes.sectionTitle + 1}>
          {t('address.editTitle')}
        </AppText>
      </View>
      <View style={styles.content}>
        {addresses.isError ? (
          <>
            <AppText color={colors.danger}>{t('address.loadFailed')}</AppText>
            <Button label={t('common.retry')} variant="soft" onPress={() => void addresses.refetch()} />
          </>
        ) : addresses.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <AppText color={colors.ink2}>{t('address.notFound')}</AppText>
        )}
      </View>
    </View>
  );
}

function AddressForm({ editId }: { editId: number | undefined }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const addresses = useAddresses();
  const editing = addresses.data?.find((a) => a.id === editId);
  const accountPhone = useSession((s) => s.user?.phone ?? '');
  const userId = useSession((s) => s.user?.id);
  const actions = useAddressActions();

  const [type, setType] = useState<AddressType>(editing?.type ?? 'apartment');
  const [building, setBuilding] = useState(editing?.building ?? '');
  const [apartment, setApartment] = useState(editing?.apartment ?? '');
  const [floor, setFloor] = useState(editing?.floor ?? '');
  const [street, setStreet] = useState(editing?.street ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? accountPhone);
  const [landmark, setLandmark] = useState(editing?.landmark ?? '');
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);
  const [errors, setErrors] = useState<Partial<Record<'landmark' | 'apartment' | 'phone', AddressError>>>({});

  // The spot: the picker's for a new address; the saved one (named by its landmark) when editing,
  // until the picker hands back another.
  const filled = useRef(false);
  useEffect(() => {
    if (!editing || filled.current) return;
    filled.current = true;
    usePickedSpot.setState({ spot: { lat: editing.lat, lng: editing.lng, label: editing.landmark } });
  }, [editing]);
  useEffect(() => () => usePickedSpot.setState({ spot: null }), []);
  const spot = usePickedSpot((s) => s.spot);
  const zone = useZoneCheck(spot && { lat: spot.lat, lng: spot.lng });
  // Unknown while the check is on its way or failed: the save waits for a yes (review F27).
  const deliverable = zone.data ? zone.data.zone !== null : undefined;

  const firstAddress = editId === undefined && addresses.data?.length === 0;
  const errorText = (field: 'landmark' | 'apartment' | 'phone') => (errors[field] ? t(`address.${errors[field]}` as TranslationKey) : null);

  const submit = useSubmit(async () => {
    const input = { landmark, apartment, phone: normalizePhone(phone) };
    const found = addressErrors(input);
    setErrors(found);
    if (Object.keys(found).length || !spot || userId === undefined) return;
    // The account and session that made the save: a late answer acts for no one else (review F79).
    const gen = session.generation();
    const saved = await actions.save({
      id: editId,
      type,
      building: building || null,
      floor: floor || null,
      street: street || null,
      ...input,
      lat: spot.lat,
      lng: spot.lng,
      isDefault,
    });
    if (gen !== session.generation()) return;
    if (editId === undefined) chooseAddress(userId, saved.id);
    router.back();
  });

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton />
        <AppText weight="bold" size={fontSizes.sectionTitle + 1}>
          {editId === undefined ? t('address.new') : t('address.editTitle')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.miniMap}>
          {spot && mapAvailable() ? (
            <MapView
              style={StyleSheet.absoluteFill}
              provider={mapProvider()}
              liteMode
              scrollEnabled={false}
              zoomEnabled={false}
              region={{ latitude: spot.lat, longitude: spot.lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
            >
              <Marker coordinate={{ latitude: spot.lat, longitude: spot.lng }} />
            </MapView>
          ) : (
            <MapPin size={40} color={colors.danger} fill={colors.danger} />
          )}
        </View>

        <View style={styles.spotCard}>
          <MapPin size={24} color={colors.ink2} />
          <View style={styles.flex}>
            <AppText weight="bold" size={fontSizes.listTitle}>
              {t('address.spot')}
            </AppText>
            <AppText color={colors.ink2} size={fontSizes.body} numberOfLines={1}>
              {spot?.label ?? ''}
            </AppText>
            {zone.isError ? (
              // [Open] Not captured: the check failed (review F27).
              <View style={styles.zoneRow}>
                <CircleX size={16} color={colors.danger} />
                <AppText weight="semibold" size={fontSizes.body} color={colors.danger}>
                  {t('address.checkFailed')}
                </AppText>
                <PressableScale accessibilityRole="button" accessibilityLabel={t('common.retry')} onPress={() => void zone.refetch()} hitSlop={8}>
                  <AppText weight="semibold" color={colors.primary}>
                    {t('common.retry')}
                  </AppText>
                </PressableScale>
              </View>
            ) : spot && deliverable === undefined ? (
              <AppText color={colors.ink2} size={fontSizes.body}>
                {t('address.checking')}
              </AppText>
            ) : deliverable === undefined ? null : (
              <View style={styles.zoneRow}>
                {deliverable ? <CircleCheck size={16} color={colors.success} /> : <CircleX size={16} color={colors.danger} />}
                <AppText weight="semibold" size={fontSizes.body} color={deliverable ? colors.success : colors.danger}>
                  {deliverable ? t('address.available') : t('address.unavailable')}
                </AppText>
              </View>
            )}
          </View>
          <PressableScale accessibilityRole="button" accessibilityLabel={t('address.editSpot')} onPress={() => router.push('/address/map?from=form')} hitSlop={8}>
            <AppText weight="semibold" color={colors.primary}>
              {t('address.edit')}
            </AppText>
          </PressableScale>
        </View>

        <View style={styles.chips}>
          {ADDRESS_TYPES.map((v) => {
            const on = v === type;
            const Icon = TYPE_ICONS[v];
            return (
              <PressableScale
                key={v}
                accessibilityRole="button"
                accessibilityLabel={t(`address.type.${v}`)}
                accessibilityState={{ selected: on }}
                onPress={() => setType(v)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Icon size={18} color={on ? colors.bg : colors.ink} />
                <AppText weight="semibold" color={on ? colors.bg : colors.ink}>
                  {t(`address.type.${v}`)}
                </AppText>
              </PressableScale>
            );
          })}
        </View>

        <TextField label={t('address.building')} value={building} onChangeText={setBuilding} maxLength={120} />
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField label={t('address.apartment')} value={apartment} onChangeText={setApartment} maxLength={60} error={errorText('apartment')} />
          </View>
          <View style={styles.flex}>
            <TextField label={t('address.floor')} value={floor} onChangeText={setFloor} maxLength={30} />
          </View>
        </View>
        <TextField label={t('address.street')} value={street} onChangeText={setStreet} maxLength={160} />
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField
              label={t('address.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
              error={errorText('phone')}
              icon={isEgyptianMobile(phone) ? BadgeCheck : undefined}
            />
          </View>
          <View style={styles.country} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AppText size={22}>🇪🇬</AppText>
            <AppText weight="semibold" size={17}>
              +2
            </AppText>
          </View>
        </View>
        <TextField label={t('address.landmark')} value={landmark} onChangeText={setLandmark} maxLength={160} error={errorText('landmark')} />

        <View style={styles.defaultRow}>
          <View style={styles.flex}>
            <AppText weight="bold" size={fontSizes.listTitle}>
              {t('address.default')}
            </AppText>
            {firstAddress ? (
              <AppText color={colors.ink2} size={fontSizes.body}>
                {t('address.firstDefault')}
              </AppText>
            ) : null}
          </View>
          <Switch
            accessibilityLabel={t('address.default')}
            value={firstAddress ? false : isDefault}
            disabled={firstAddress}
            onValueChange={setIsDefault}
            trackColor={{ true: colors.primary100, false: colors.line }}
            thumbColor={isDefault && !firstAddress ? colors.primary : colors.ink2}
          />
        </View>

        <Button label={t('address.save')} loading={submit.busy} disabled={!spot || deliverable !== true} onPress={() => submit.run()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  flex: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  miniMap: {
    height: 160,
    marginHorizontal: -spacing.lg,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: '#1D2333', borderColor: '#1D2333' },
  pair: { flexDirection: 'row', gap: spacing.md },
  country: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'center' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
