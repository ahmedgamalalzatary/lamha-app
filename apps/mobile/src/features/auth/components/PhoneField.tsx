import { ChevronDown, Phone } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { TextField } from '@/components/TextField';
import { useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';

/** Egypt only (contract §7): the country box shows the flag and +2 and opens nothing. */
function Country({ round }: { round?: boolean }) {
  return (
    <View style={styles.country} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AppText size={round ? 26 : 22}>🇪🇬</AppText>
      <AppText weight="semibold" size={17}>
        +2
      </AppText>
      {round ? null : <ChevronDown size={18} color={colors.ink2} />}
    </View>
  );
}

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  error?: string | null;
}

/** Tawsilty's phone step: the number with its label in the border and a ✕, the country box beside it. */
export function PhoneField({ value, onChangeText, error }: Props) {
  const t = useT();
  return (
    <View style={styles.row}>
      <View style={styles.number}>
        <TextField
          label={t('auth.phone')}
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={11}
          clearable
          autoFocus
          error={error}
        />
      </View>
      <View style={styles.countryBox}>
        <Country />
      </View>
    </View>
  );
}

/** "أهلاً بعودتك": the phone typed on the step before, locked, with the 11/11 count under it. */
export function LockedPhone({ phone }: { phone: string }) {
  const t = useT();
  return (
    <View style={styles.lockedWrap}>
      <AppText weight="semibold" size={16}>
        {t('auth.phone')}
      </AppText>
      <View style={styles.locked} accessible accessibilityLabel={`${t('auth.phone')}: ${phone}`}>
        <Phone size={22} color={colors.ink2} />
        <AppText size={17} style={styles.lockedNumber}>
          {phone}
        </AppText>
        <Country round />
      </View>
      <AppText size={12} color={colors.ink2} style={styles.count}>
        {`${phone.length}/11`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  number: { flex: 2.2 },
  countryBox: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#E3E4E8',
    borderRadius: radius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  country: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lockedWrap: { gap: spacing.md },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#E3E4E8',
    borderRadius: radius.lg + 4,
    paddingHorizontal: spacing.xl,
  },
  lockedNumber: { flex: 1, textAlign: 'right' },
  count: { alignSelf: 'flex-end', marginTop: -spacing.xs },
});
