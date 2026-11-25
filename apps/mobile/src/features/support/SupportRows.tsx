import { router } from 'expo-router';
import { ChevronLeft, Headset, Lightbulb, List, MessageSquare, PhoneCall, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { AccountRow } from '@/features/account/components/AccountRow';
import { useSupportPhones } from './api';

/**
 * حسابي › الدعم والمساعدة (contract §8.14, customer/account/account-support-and-account-groups.png):
 * تقديم مقترح, تقديم شكوى (the "نوع الشكوى" menu: طلب سابق or عامة, complaint-type-menu.png) and
 * التواصل معنا (the sheet of numbers, contact-us-sheet.png).
 */
export function SupportRows() {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const [contact, setContact] = useState(false);
  const go = (to: () => void) => {
    setMenu(false);
    to();
  };

  return (
    <>
      <AppText weight="semibold" color={colors.ink2} style={styles.group}>
        {t('support.group')}
      </AppText>
      <AccountRow icon={Lightbulb} label={t('support.suggest')} onPress={() => router.push({ pathname: '/support/[type]', params: { type: 'suggestion' } })} />
      <AccountRow icon={TriangleAlert} label={t('support.complain')} onPress={() => setMenu(true)} />
      <AccountRow icon={Headset} label={t('support.contact')} onPress={() => setContact(true)} />

      {/* The menu floats over the rows, as in the photo [Derived: its exact place]. */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.menuBackdrop} onPress={() => setMenu(false)}>
          <View style={styles.menu}>
            <AppText size={fontSizes.caption} color={colors.ink2} style={styles.menuTitle}>
              {t('support.complaintType')}
            </AppText>
            <MenuRow icon={List} label={t('support.pastOrder')} onPress={() => go(() => router.push('/support-orders'))} />
            <MenuRow
              icon={MessageSquare}
              label={t('support.general')}
              onPress={() => go(() => router.push({ pathname: '/support/[type]', params: { type: 'complaint' } }))}
            />
          </View>
        </Pressable>
      </Modal>

      <BottomSheet visible={contact} title={t('support.contactTitle')} onClose={() => setContact(false)}>
        <ContactList open={contact} />
      </BottomSheet>
    </>
  );
}

function MenuRow({ icon: Icon, label, onPress }: { icon: typeof List; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.menuRow}>
      <AppText size={fontSizes.listTitle + 1} style={styles.grow}>
        {label}
      </AppText>
      <Icon size={22} color={colors.ink} />
    </PressableScale>
  );
}

function ContactList({ open }: { open: boolean }) {
  const t = useT();
  const phones = useSupportPhones(open);
  if (phones.isPending) return <Skeleton style={styles.skeleton} />;
  if (phones.isError) return <AppText color={colors.danger}>{errorMessage(phones.error)}</AppText>;
  if (phones.data.length === 0) return <AppText color={colors.ink2}>{t('support.noPhones')}</AppText>;
  return (
    <View style={styles.phones}>
      {phones.data.map((p, i) => (
        <PressableScale
          key={i}
          accessibilityRole="button"
          accessibilityLabel={`${p.label} ${p.phone}`}
          onPress={() => void Linking.openURL(`tel:${p.phone}`)}
          style={styles.phone}
        >
          <View style={styles.phoneIcon}>
            <PhoneCall size={22} color={colors.info} />
          </View>
          <View style={styles.grow}>
            <AppText weight="bold">{p.label}</AppText>
            <AppText color={colors.ink2}>{p.phone}</AppText>
          </View>
          <DirectionalIcon icon={ChevronLeft} size={20} color={colors.ink2} />
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: spacing.xl, marginBottom: spacing.xs },
  grow: { flex: 1 },
  menuBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xxl * 2 },
  menu: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuTitle: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  skeleton: { height: 72, borderRadius: radius.md },
  phones: { gap: spacing.md, paddingBottom: spacing.md },
  phone: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
  phoneIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: '#E6EEFC', alignItems: 'center', justifyContent: 'center' },
});
