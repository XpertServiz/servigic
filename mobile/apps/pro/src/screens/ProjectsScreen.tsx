// Big Projects for pros: invitations from Servigic (labour only) and the stages of the projects the pro is on.
// The pro sees only his own scope and payout; the address and customer contact appear once Servigic confirms the team.
// Pro app only. No ads on this screen.
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { Icon } from "../components/Icon";
import { useI18n } from "../lib/i18n";

const money = (n: number) => `PKR ${Math.round(n).toLocaleString("en-US")}`;

export default function ProjectsScreen() {
  const { t, td } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [items, setItems] = useState<api.ProProjectItem[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.getProProjects().then((r) => setItems(r.items)).catch(() => setItems([])); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); load(); } catch (e) { Alert.alert(t("proj.pro.couldNot"), e instanceof Error ? e.message : ""); } finally { setBusy(false); }
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.back} accessibilityLabel={t("common.back")}><Icon name="back" size={16} /></Pressable>
        <Text style={s.title}>{t("proj.pro.title")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {items === null && <ActivityIndicator color={colors.accent} />}
        {items?.length === 0 && <Text style={s.muted}>{t("proj.pro.empty")}</Text>}
        {items?.map((a) => (
          <View key={a.id} style={s.card}>
            <Text style={s.cardTitle}>{a.project.reference} - {[a.project.area, a.project.city].filter(Boolean).join(", ")}</Text>
            <Text style={s.status}>{td(`proj.pro.st.${a.status}`) ?? a.status}</Text>
            <Text style={s.muted}>{t("proj.pro.work", { x: a.scope })}</Text>
            <Text style={s.muted}>{t("proj.pro.payout", { x: money(a.payoutAmount) })}{a.project.areaSqft ? `  -  ${a.project.areaSqft} sq ft` : ""}</Text>
            {(a.plannedStart || a.plannedEnd) && <Text style={s.muted}>{t("proj.pro.planned", { a: a.plannedStart ? new Date(a.plannedStart).toLocaleDateString() : "?", b: a.plannedEnd ? new Date(a.plannedEnd).toLocaleDateString() : "?" })}</Text>}
            {a.status === "invited" && (
              <>
                <Text style={s.muted}>{t("proj.pro.answerBefore", { x: new Date(a.respondBy).toLocaleString() })}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable disabled={busy} onPress={() => run(() => api.answerProProject(a.id, { action: "accept" }))} style={s.cta}><Text style={s.ctaText}>{t("common.accept")}</Text></Pressable>
                  <Pressable disabled={busy} onPress={() => run(() => api.answerProProject(a.id, { action: "decline" }))} style={s.ghost}><Text style={s.ghostText}>{t("common.decline")}</Text></Pressable>
                </View>
              </>
            )}
            {a.contact && (
              <View style={{ gap: 4 }}>
                <Text style={s.muted}>{t("proj.pro.address", { x: a.contact.address })}</Text>
                <Pressable onPress={() => Linking.openURL(`tel:${a.contact!.phone}`)}><Text style={{ color: colors.accent }}>{t("proj.pro.callName", { name: a.contact.name, phone: a.contact.phone })}</Text></Pressable>
              </View>
            )}
            {a.milestones.map((m) => (
              <View key={m.id} style={s.stage}>
                <Text style={s.cardTitle}>{m.title}</Text>
                <Text style={s.muted}>{td(`proj.pro.stage.${m.status}`) ?? m.status}{m.amount ? `  -  ${money(m.amount)}` : ""}{m.paidAmount ? `  ${t("proj.pro.paid", { x: money(m.paidAmount) })}` : ""}</Text>
                {a.status === "active" && m.status === "planned" && (
                  <>
                    <TextInput style={s.input} placeholder={t("proj.pro.notePh")} placeholderTextColor={colors.textFaint} value={notes[m.id] ?? ""} onChangeText={(v) => setNotes((n) => ({ ...n, [m.id]: v }))} />
                    <Pressable disabled={busy} onPress={() => run(() => api.answerProProject(a.id, { action: "ready", milestoneId: m.id, note: notes[m.id]?.trim() || undefined }))} style={s.cta}><Text style={s.ctaText}>{t("proj.pro.markReady")}</Text></Pressable>
                  </>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.bgElevated, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  status: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  stage: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 6, marginTop: 4 },
  cta: { flex: 1, backgroundColor: colors.accent, borderRadius: 999, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  ctaText: { color: colors.accentForeground, fontWeight: "700", fontSize: 14 },
  ghost: { flex: 1, borderRadius: 999, minHeight: 44, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  ghostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  input: { backgroundColor: colors.bgElevated2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
});
