// The small reassurance rows of the sign-in screen: four trade icons in gold rings (above the form) and Safe / Fast / Reliable
// badges (below it), plus the line-art skyline of Pakistan at the very bottom.
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";

const G = colors.accent;
const sp = { stroke: G, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Glyph({ name }: { name: "ac" | "bolt" | "tap" | "broom" | "shield" | "clock" | "medal" }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {name === "ac" && (<><Rect x={3} y={6} width={18} height={8} rx={2} {...sp} /><Path d="M7 17c0 1.5-1 2-1 3M12 17c0 1.5-1 2-1 3M17 17c0 1.5-1 2-1 3" {...sp} /></>)}
      {name === "bolt" && <Path d="M13 2L5 14h6l-1 8 8-12h-6z" {...sp} />}
      {name === "tap" && (<><Path d="M4 9h9a3 3 0 013 3v1M8 9V6h4M16 13v2" {...sp} /><Path d="M16 19c-1 0-1.5-.8-1.2-1.6.2-.5.8-1.4 1.2-2 .4.6 1 1.5 1.2 2 .3.8-.2 1.6-1.2 1.6z" {...sp} /></>)}
      {name === "broom" && (<><Path d="M14 3l-4 8" {...sp} /><Path d="M7 11h6l2 4-3 6H6l-1-6z" {...sp} /></>)}
      {name === "shield" && (<><Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" {...sp} /><Path d="M8.5 12l2.5 2.5L15.5 10" {...sp} /></>)}
      {name === "clock" && (<><Circle cx={12} cy={13} r={7} {...sp} /><Path d="M12 9v4l2 2M10 3h4" {...sp} /></>)}
      {name === "medal" && (<><Circle cx={12} cy={10} r={5} {...sp} /><Path d="M9 15l-1.5 6L12 19l4.5 2L15 15" {...sp} /></>)}
    </Svg>
  );
}

const Ring = ({ children }: { children: React.ReactNode }) => <View style={styles.ring}>{children}</View>;

export function AuthTradeRow() {
  const t = useT();
  const items = [["ac", t("trade.AC_TECHNICIAN")], ["bolt", t("trade.ELECTRICIAN")], ["tap", t("trade.PLUMBER")], ["broom", t("trade.CLEANER")]] as const;
  return (
    <View style={styles.row}>
      {items.map(([g, label]) => (
        <View key={g} style={styles.item}>
          <Ring><Glyph name={g} /></Ring>
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export function AuthBadgeRow() {
  const t = useT();
  const items = [["shield", t("auth.badgeSafe")], ["clock", t("auth.badgeFast")], ["medal", t("auth.badgeReliable")]] as const;
  return (
    <View style={[styles.row, { gap: 14, justifyContent: "center" }]}>
      {items.map(([g, label]) => (
        <View key={g} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={styles.small}><Glyph name={g} /></View>
          <Text style={styles.badge}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Line-art skyline of the country (Pakistan today); other countries show nothing until their artwork is added. */
export function AuthSkyline({ country }: { country: string }) {
  if (country.toUpperCase() !== "PK") return null;
  return <Image source={require("../../assets/auth/hero/skyline_pk.png")} style={styles.sky} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 14 },
  item: { alignItems: "center", width: 74 },
  ring: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: G, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,166,35,0.08)" },
  small: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(245,166,35,0.6)", alignItems: "center", justifyContent: "center", transform: [{ scale: 0.8 }] },
  label: { color: colors.textSecondary, fontSize: 11, marginTop: 5 },
  badge: { color: colors.text, fontSize: 15, fontWeight: "600" },
  sky: { width: "100%", height: 80, marginTop: 14, opacity: 0.9 },
});
