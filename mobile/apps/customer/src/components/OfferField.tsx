// "Your offer": the customer names the price he wants to pay (like inDrive); pros accept it or answer with their own.
// Shows what is realistic for this service in his city and currency, warns when the offer is so low that pros will probably
// ignore it, and suggests the range that gets a bid fastest.
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";

const fmt = (n: number) => n.toLocaleString();
// Step of the + / - buttons: about 5% of the suggested price, in a round number.
const stepFor = (g: api.PriceGuide | null) => {
  const raw = (g?.suggested ?? 1000) * 0.05;
  return raw < 10 ? 5 : raw < 100 ? Math.round(raw / 5) * 5 : Math.round(raw / 50) * 50;
};

export function OfferField({ categoryId, city, value, onChange }: { categoryId: string; city: string | null; value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [guide, setGuide] = useState<api.PriceGuide | null>(null);

  useEffect(() => {
    if (!categoryId || !city) return;
    let alive = true;
    api
      .getPriceGuide(categoryId, city)
      .then((d) => {
        if (alive) setGuide(d.guide);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [categoryId, city]);

  const cur = guide?.currency ?? "";
  const money = (n: number) => `${cur} ${fmt(n)}`.trim();
  const offer = Number(value) || 0;
  const step = stepFor(guide);
  const set = (n: number) => onChange(String(Math.max(0, Math.round(n))));

  let verdict: "none" | "too-low" | "low" | "good" | "high" = "none";
  if (guide && offer > 0) verdict = offer < guide.floor ? "too-low" : offer < guide.low ? "low" : offer > guide.high * 1.4 ? "high" : "good";

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.label}>{t("offer.title")}{cur ? ` · ${cur}` : ""}</Text>
      <View style={styles.row}>
        <Pressable onPress={() => set((offer || guide?.suggested || step * 2) - step)} style={styles.stepBtn}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          placeholder={guide ? fmt(guide.suggested) : ""}
          placeholderTextColor={colors.textFainter}
          style={styles.input}
        />
        <Pressable onPress={() => set((offer || guide?.suggested || step * 2) + step)} style={styles.stepBtn}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      {guide && (
        <Text style={styles.hint}>
          {t("offer.hint", { range: `${money(guide.low)}–${fmt(guide.high)}` })}
        </Text>
      )}
      {verdict === "too-low" && guide && (
        <View style={[styles.box, { borderColor: colors.dangerSoft }]}>
          <Text style={{ color: colors.text, fontSize: 13 }}>{t("offer.tooLow", { low: money(guide.low), high: money(guide.high) })}</Text>
          <Pressable onPress={() => set(guide.suggested)}>
            <Text style={styles.link}>{t("offer.use", { price: money(guide.suggested) })}</Text>
          </Pressable>
        </View>
      )}
      {verdict === "low" && guide && (
        <View style={[styles.box, { borderColor: colors.accentBorder }]}>
          <Text style={{ color: colors.text, fontSize: 13 }}>{t("offer.low", { low: money(guide.low) })}</Text>
          <Pressable onPress={() => set(guide.low)}>
            <Text style={styles.link}>{t("offer.use", { price: money(guide.low) })}</Text>
          </Pressable>
        </View>
      )}
      {verdict === "good" && <Text style={[styles.hint, { color: colors.success }]}>{t("offer.good")}</Text>}
      {verdict === "high" && <Text style={styles.hint}>{t("offer.high")}</Text>}
      {verdict === "none" && guide && (
        <Pressable onPress={() => set(guide.suggested)}>
          <Text style={styles.link}>{t("offer.suggested", { price: money(guide.suggested) })}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 10, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.bgElevated2, borderWidth: 1, borderColor: colors.accentBorder, alignItems: "center", justifyContent: "center" },
  stepText: { color: colors.accent, fontSize: 22, fontWeight: "800" },
  input: { flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  box: { marginTop: 8, borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: colors.bgElevated, gap: 6 },
  link: { color: colors.accent, fontWeight: "700", fontSize: 13, marginTop: 6 },
});
