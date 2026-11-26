import { formatAmount, type StorePage } from "@tawsela/shared";
import { type Href, router } from "expo-router";
import { Bike, type LucideIcon, Tag, Ticket } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/PressableScale";
import { toast } from "@/components/Toast";
import { useLocale, useT } from "@/core/i18n";
import { colors, fontSizes, radius, sizes, spacing } from "@/core/theme";
import { discountText, voucherText } from "@/features/offers/offer-text";

/**
 * The offer cards under a store's info row (contract §8.4, restaurant-store-top-info-offer-cards,
 * market-store-top-free-delivery-offers), side by side: the voucher (عرض القسائم opens قسائمي), the
 * free delivery, and the product discounts (عرض المنتجات opens them as one grid).
 */
export function OfferCards({
  store,
  onVouchers,
}: {
  store: StorePage;
  onVouchers: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { width } = useWindowDimensions();
  const free = store.offers.freeDeliveryFrom;
  const voucher = store.vouchers[0];
  const cards: { key: string; node: ReactNode }[] = [];
  if (voucher) {
    cards.push({
      key: "voucher",
      node: (
        <Card
          icon={Ticket}
          tint={colors.violet}
          tile={colors.violet50}
          title={voucherText(t, voucher, locale)}
          pill={t("offers.voucher")}
          note={t("offers.vouchersAvailable")}
          action={t("offers.viewVouchers")}
          onPress={onVouchers}
        />
      ),
    });
  }
  if (free !== null) {
    const amount = formatAmount(free, locale);
    const note =
      free > 0
        ? t("offers.freeFromNote", { amount })
        : t("offers.freeAlwaysNote");
    cards.push({
      key: "free",
      node: (
        <Card
          icon={Bike}
          tint={colors.success}
          tile={colors.success50}
          title={
            free > 0 ? t("offers.freeFrom", { amount }) : t("offers.freeAlways")
          }
          note={note}
          action={t("offers.moreInfo")}
          // [Open] Tawsilty's "المزيد من المعلومات" sheet is not captured; the rule is the whole story.
          onPress={() => toast.show(note, "hint")}
        />
      ),
    });
  }
  if (store.offers.discount) {
    cards.push({
      key: "discount",
      node: (
        <Card
          icon={Tag}
          tint={colors.danger}
          tile={colors.danger50}
          title={discountText(t, store.offers.discount, locale)}
          action={t("offers.viewProducts")}
          onPress={() =>
            router.push(`/store/${store.id}/products?offers=1` as Href)
          }
        />
      ),
    });
  }
  if (!cards.length) return null;
  // One card spans the page; more scroll sideways, the next one peeking in.
  const cardWidth = cards.length === 1 ? width - spacing.lg * 2 : width * 0.78;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {cards.map((card) => (
        <View key={card.key} style={{ width: cardWidth }}>
          {card.node}
        </View>
      ))}
    </ScrollView>
  );
}

function Card({
  icon: Icon,
  tint,
  tile,
  title,
  pill,
  note,
  action,
  onPress,
}: {
  icon: LucideIcon;
  tint: string;
  tile: string;
  title: string;
  pill?: string;
  note?: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.tile, { backgroundColor: tile }]}>
          <Icon size={22} color={tint} />
        </View>
        <View style={styles.text}>
          <View style={styles.titleRow}>
            {pill ? (
              <View style={styles.pill}>
                <AppText
                  weight="bold"
                  size={fontSizes.caption}
                  color={colors.bg}
                >
                  {pill}
                </AppText>
              </View>
            ) : null}
            <AppText
              weight="bold"
              size={fontSizes.listTitle}
              style={styles.title}
            >
              {title}
            </AppText>
          </View>
          {note ? (
            <AppText color={colors.ink2} size={fontSizes.body}>
              {note}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.dash} />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={action}
        onPress={onPress}
        hitSlop={8}
        style={styles.action}
      >
        <AppText
          weight="semibold"
          size={fontSizes.body}
          style={styles.underline}
        >
          {action}
        </AppText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    overflow: "hidden",
  },
  top: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  tile: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: spacing.xs, alignItems: "flex-start" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  title: { flexShrink: 1 },
  pill: {
    backgroundColor: colors.voucherPill,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dash: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    marginHorizontal: spacing.lg,
  },
  action: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "flex-start",
  },
  underline: { textDecorationLine: "underline" },
});
