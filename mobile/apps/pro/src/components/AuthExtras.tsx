// The small extras of each sign-in design: a row of trade icons, or three reassurance badges.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";

export type AuthExtrasKind = "trades" | "tradesRing" | "badgesA" | "badgesB" | "none";

export function AuthExtras({ kind }: { kind: AuthExtrasKind }) {
  const t = useT();
  if (kind === "none") return null;
  const items: [string, string][] =
    kind === "trades" || kind === "tradesRing"
      ? [["❄️", t("trade.AC_TECHNICIAN")], ["⚡", t("trade.ELECTRICIAN")], ["🚰", t("trade.PLUMBER")], ["🏠", t("auth.homeServices")]]
      : kind === "badgesA"
        ? [["🛡️", t("auth.badgeSafe")], ["⏱️", t("auth.badgeFast")], ["👍", t("auth.badgeReliable")]]
        : [["🧑‍🔧", t("auth.badgePros")], ["💰", t("auth.badgePrices")], ["🕘", t("auth.badgeSupport")]];
  const ring = kind === "tradesRing" || kind === "badgesA" || kind === "badgesB";
  return (
    <View style={styles.row}>
      {items.map(([icon, label]) => (
        <View key={label} style={styles.item}>
          <View style={[styles.icon, ring && styles.ring]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-around", marginTop: 26 },
  item: { alignItems: "center", width: 78 },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  ring: { borderWidth: 1.5, borderColor: colors.accent, borderRadius: 22 },
  label: { color: colors.accent, fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 4 },
});
