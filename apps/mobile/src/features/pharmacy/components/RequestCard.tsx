import type { CatalogStore, PharmacyRequestKind } from '@tawsela/shared';
import { router } from 'expo-router';
import { ArrowLeft, Camera, type LucideIcon, ReceiptText, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { OfferBadges } from '@/features/offers/components/OfferBadges';
import { useStores } from '@/features/stores/api/stores';
import { StoreMeta } from '@/features/stores/components/StoreMeta';
import { StorePicture } from '@/features/stores/components/StoreRow';

/**
 * "سهلنا الطلب عليك" on the pharmacies page (contract §8.11, pharmacy-page-prescription-photo-cards-list):
 * an orange "توصيل فوري" strip with "30 - 60 دقيقة", then "روشتة طبية" and "صورة المنتج". Each opens
 * "اختر صيدلية (<n>)"; a pharmacy's "التالي" opens "الروشتة" for it.
 */
export function PharmacyRequestCard() {
  const t = useT();
  const [kind, setKind] = useState<PharmacyRequestKind | null>(null);
  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>{t('pharmacy.easyTitle')}</AppText>
      <View style={styles.card}>
        <View style={styles.strip}>
          <Zap size={18} color={colors.bg} />
          <AppText weight="semibold" color={colors.bg} style={styles.grow}>{t('pharmacy.instant')}</AppText>
          <View style={styles.eta}>
            <AppText color={colors.primary}>{t('pharmacy.eta')}</AppText>
          </View>
        </View>
        <View style={styles.tiles}>
          <Tile icon={ReceiptText} label={t('pharmacy.kind.prescription')} onPress={() => setKind('prescription')} />
          <Tile icon={Camera} label={t('pharmacy.kind.product')} onPress={() => setKind('product')} />
        </View>
      </View>
      <ChoosePharmacy kind={kind} onClose={() => setKind(null)} />
    </View>
  );
}

function Tile({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.tile}>
      <Icon size={34} color={colors.primary} />
      <AppText size={fontSizes.listTitle}>{label}</AppText>
    </PressableScale>
  );
}

/** "اختر صيدلية (<n>)": every pharmacy of the customer's area, each with "التالي". */
function ChoosePharmacy({ kind, onClose }: { kind: PharmacyRequestKind | null; onClose: () => void }) {
  const t = useT();
  const pharmacies = useStores({ vertical: 'pharmacy' });
  const list = pharmacies.data ?? [];
  const next = (store: CatalogStore) => {
    if (!kind) return;
    onClose();
    router.push({ pathname: '/pharmacy-request', params: { pharmacy: String(store.id), kind } });
  };
  return (
    <BottomSheet visible={kind !== null} onClose={onClose} title={t('pharmacy.choose', { count: list.length })}>
      {pharmacies.isPending ? (
        <Skeleton style={styles.cardSkeleton} />
      ) : list.length ? (
        <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetContent}>
          {list.map((store) => (
            <View key={store.id} style={styles.pharmacy}>
              <View style={styles.row}>
                <StorePicture store={store} size={88} />
                <View style={styles.grow}>
                  <AppText weight="bold" size={fontSizes.listTitle} numberOfLines={1}>{store.name}</AppText>
                  <StoreMeta store={store} />
                  <OfferBadges offers={store.offers} />
                </View>
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${t('pharmacy.next')} ${store.name}`}
                onPress={() => next(store)}
                style={styles.next}
              >
                <AppText weight="semibold" color={colors.primary}>{t('pharmacy.next')}</AppText>
                <DirectionalIcon icon={ArrowLeft} size={18} color={colors.primary} />
              </PressableScale>
            </View>
          ))}
        </ScrollView>
      ) : (
        <AppText color={colors.ink2} style={styles.none}>{t('pharmacy.none')}</AppText>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, paddingHorizontal: spacing.lg },
  grow: { flex: 1 },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.bg },
  strip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  eta: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  tiles: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, minHeight: 150, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  cardSkeleton: { height: 180, borderRadius: radius.lg },
  sheetList: { maxHeight: 520 },
  sheetContent: { gap: spacing.md, paddingBottom: spacing.lg },
  pharmacy: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  next: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 48, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary100, backgroundColor: colors.primary50 },
  none: { textAlign: 'center', paddingVertical: spacing.xl },
});
