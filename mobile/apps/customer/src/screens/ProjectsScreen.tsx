// Big Projects (whole-house wiring, plumbing...): my requests, a new request, and the detail with the estimate to accept.
// Customer app only. No ads on this screen.
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as api from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { colors } from "../lib/theme";
import { Icon } from "../components/Icon";

const TRADE_KEYS = ["electrical", "plumbing", "painting", "carpentry", "tiling", "false_ceiling", "renovation", "hvac", "solar", "cctv", "other"];
const BUDGET_KEYS = ["u1", "1-2", "2-5", "5-10", "10p", "unsure"];
const money = (n: number, c: string) => `${c} ${Math.round(n).toLocaleString("en-US")}`;

export default function ProjectsScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [mode, setMode] = useState<"list" | "new" | "detail">("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const back = () => (mode === "list" ? navigation.goBack() : (setMode("list"), setOpenId(null)));
  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.header}>
        <Pressable onPress={back} style={s.back} accessibilityLabel={t("common.back")}><Icon name="back" size={16} /></Pressable>
        <Text style={s.title}>{t("proj.title")}</Text>
      </View>
      {mode === "list" && <List onNew={() => setMode("new")} onOpen={(id) => { setOpenId(id); setMode("detail"); }} />}
      {mode === "new" && <NewRequest onDone={(id) => { setOpenId(id); setMode("detail"); }} />}
      {mode === "detail" && openId && <Detail id={openId} />}
    </View>
  );
}

function List({ onNew, onOpen }: { onNew: () => void; onOpen: (id: string) => void }) {
  const { t, td } = useI18n();
  const tradeName = (k: string) => td(`proj.trade.${k}`) ?? k;
  const [items, setItems] = useState<api.BigProjectListItem[] | null>(null);
  useFocusEffect(useCallback(() => { api.getMyProjects().then((r) => setItems(r.projects)).catch(() => setItems([])); }, []));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={s.muted}>{t("proj.intro")}</Text>
      <Pressable onPress={onNew} style={s.cta}><Text style={s.ctaText}>{t("proj.getEstimate")}</Text></Pressable>
      {items === null && <ActivityIndicator color={colors.accent} />}
      {items?.map((p) => (
        <Pressable key={p.id} onPress={() => onOpen(p.id)} style={s.card}>
          <Text style={s.cardTitle}>{p.reference}</Text>
          <Text style={s.muted}>{p.trades.map(tradeName).join(", ")} - {[p.area, p.city].filter(Boolean).join(", ")}</Text>
          <Text style={s.status}>{td(`proj.status.${p.status}`) ?? p.status}{p.contractAmount ? `  -  ${money(p.contractAmount, p.currency)}` : ""}</Text>
        </Pressable>
      ))}
      {items?.length === 0 && <Text style={s.muted}>{t("proj.none")}</Text>}
    </ScrollView>
  );
}

function NewRequest({ onDone }: { onDone: (id: string) => void }) {
  const { t, td } = useI18n();
  const { user } = useAuth();
  const u = user as unknown as { name?: string; phone?: string; email?: string } | null;
  const [trades, setTrades] = useState<string[]>([]);
  const [city, setCity] = useState("Karachi");
  const [area, setArea] = useState("");
  const [name, setName] = useState(u?.name ?? "");
  const [phone, setPhone] = useState(u?.phone ?? "");
  const [email, setEmail] = useState(u?.email ?? "");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = (k: string) => setTrades((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));

  async function submit() {
    if (trades.length === 0) return Alert.alert(t("proj.pickTrade"));
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert(t("proj.needEmail"));
    if (!consent) return Alert.alert(t("proj.needConsent"));
    setBusy(true);
    try {
      const r = await api.createProject({ trades, city: city.trim(), area: area.trim() || undefined, name: name.trim(), phone: phone.trim(), email: email.trim(), budgetBand: budget || undefined, notes: notes.trim() || undefined, preferredContact: "both", bestTime: "anytime", consent: true });
      Alert.alert(t("proj.thanksTitle"), t("proj.thanksBody", { ref: r.reference }));
      onDone(r.id);
    } catch (e) {
      Alert.alert(t("proj.couldNot"), e instanceof Error ? e.message : t("proj.tryAgain"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>{t("proj.whatNeed")}</Text>
      <View style={s.chips}>{TRADE_KEYS.map((k) => <Pressable key={k} onPress={() => toggle(k)} style={[s.chip, trades.includes(k) && s.chipOn]}><Text style={[s.chipText, trades.includes(k) && { color: colors.accent }]}>{td(`proj.trade.${k}`) ?? k}</Text></Pressable>)}</View>
      <TextInput style={s.input} placeholder={t("proj.city")} placeholderTextColor={colors.textFaint} value={city} onChangeText={setCity} />
      <TextInput style={s.input} placeholder={t("proj.area")} placeholderTextColor={colors.textFaint} value={area} onChangeText={setArea} />
      <TextInput style={s.input} placeholder={t("proj.name")} placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} />
      <TextInput style={s.input} placeholder={t("proj.mobile")} placeholderTextColor={colors.textFaint} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={s.input} placeholder={t("proj.email")} placeholderTextColor={colors.textFaint} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Text style={s.label}>{t("proj.budget")}</Text>
      <View style={s.chips}>{BUDGET_KEYS.map((k) => <Pressable key={k} onPress={() => setBudget(budget === k ? "" : k)} style={[s.chip, budget === k && s.chipOn]}><Text style={[s.chipText, budget === k && { color: colors.accent }]}>{td(`proj.budget.${k}`) ?? k}</Text></Pressable>)}</View>
      <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} placeholder={t("proj.notes")} placeholderTextColor={colors.textFaint} value={notes} onChangeText={setNotes} multiline maxLength={1000} />
      <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={[s.box, consent && s.boxOn]} /><Text style={[s.muted, { flex: 1 }]}>{t("proj.consent")}</Text>
      </Pressable>
      <Pressable onPress={submit} disabled={busy} style={[s.cta, busy && { opacity: 0.6 }]}><Text style={s.ctaText}>{busy ? t("proj.sending") : t("proj.send")}</Text></Pressable>
    </ScrollView>
  );
}

function Detail({ id }: { id: string }) {
  const { t, td } = useI18n();
  const tradeName = (k: string) => td(`proj.trade.${k}`) ?? k;
  const [stars, setStars] = useState(0);
  const [rateComment, setRateComment] = useState("");
  const [p, setP] = useState<api.BigProjectDetail | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.getProject(id).then((r) => setP(r.project)).catch(() => null); }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!p) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  const est = p.estimate?.status === "sent" ? p.estimate : null;

  async function answer(action: "accept" | "revise" | "decline") {
    if (action === "revise" && !comment.trim()) return Alert.alert(t("proj.writeChange"));
    setBusy(true);
    try { await api.answerProjectEstimate(id, action, comment.trim() || undefined); setComment(""); load(); }
    catch (e) { Alert.alert(t("proj.couldNot"), e instanceof Error ? e.message : t("proj.tryAgain")); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={s.cardTitle}>{p.reference}</Text>
      <Text style={s.status}>{td(`proj.status.${p.status}`) ?? p.status}</Text>
      <Text style={s.muted}>{p.trades.map(tradeName).join(", ")} - {[p.area, p.city].filter(Boolean).join(", ")}</Text>
      {p.siteVisitAt && <Text style={s.muted}>{t("proj.visit", { when: new Date(p.siteVisitAt).toLocaleString() })}</Text>}

      {p.status === "completed" && (p.rating ? <Text style={s.status}>{t("proj.rated", { n: p.rating })}</Text> : (
        <View style={s.card}>
          <Text style={s.cardTitle}>{t("proj.rateTitle")}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setStars(n)} accessibilityLabel={`${n}`} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 30, color: n <= stars ? colors.accent : colors.textFaint }}>{n <= stars ? "\u2605" : "\u2606"}</Text></Pressable>)}</View>
          <TextInput style={s.input} placeholder={t("proj.ratePh")} placeholderTextColor={colors.textFaint} value={rateComment} onChangeText={setRateComment} multiline maxLength={1000} />
          <Pressable disabled={busy} onPress={async () => { if (!stars) return Alert.alert(t("proj.rateStars")); setBusy(true); try { await api.rateProject(id, stars, rateComment.trim() || undefined); load(); } catch (e) { Alert.alert(t("proj.couldNot"), e instanceof Error ? e.message : t("proj.tryAgain")); } finally { setBusy(false); } }} style={s.cta}><Text style={s.ctaText}>{t("proj.rateSend")}</Text></Pressable>
        </View>
      ))}

      {p.estimate && (
        <View style={s.card}>
          <Text style={s.cardTitle}>{t("proj.estimateHead", { v: p.estimate.version, total: money(p.estimate.total, p.estimate.currency) })}</Text>
          {p.estimate.items.map((i, k) => <Text key={k} style={s.muted}>{i.description} - {i.qty} {i.unit} x {money(i.unitPrice, p.estimate!.currency)} ({i.materialsBy === "customer" ? t("proj.matsCustomer") : t("proj.matsServigic")})</Text>)}
          {p.estimate.terms ? <Text style={s.muted}>{p.estimate.terms}</Text> : null}
          <Text style={s.muted}>{t("proj.guarantee", { days: p.warrantyDays })}</Text>
          <Pressable onPress={() => Linking.openURL(p.estimate!.link)}><Text style={{ color: colors.accent }}>{t("proj.openEstimate")}</Text></Pressable>
          {est ? (
            <>
              <TextInput style={s.input} placeholder={t("proj.commentPh")} placeholderTextColor={colors.textFaint} value={comment} onChangeText={setComment} multiline />
              <Pressable disabled={busy} onPress={() => answer("accept")} style={s.cta}><Text style={s.ctaText}>{t("proj.accept")}</Text></Pressable>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable disabled={busy} onPress={() => answer("revise")} style={s.ghost}><Text style={s.ghostText}>{t("proj.revise")}</Text></Pressable>
                <Pressable disabled={busy} onPress={() => answer("decline")} style={s.ghost}><Text style={s.ghostText}>{t("proj.decline")}</Text></Pressable>
              </View>
            </>
          ) : <Text style={s.status}>{t("proj.answered", { s: p.estimate.status.replace("_", " ") })}</Text>}
        </View>
      )}

      {p.team.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>{t("proj.team")}</Text>
          {p.team.map((m, k) => <Text key={k} style={s.muted}>{m.name} - {m.trades.map(tradeName).join(", ")}{m.verified ? ` (${t("proj.verified")})` : ""}</Text>)}
        </View>
      )}
      {p.milestones.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>{t("proj.progress")}</Text>
          {p.milestones.map((m) => <Text key={m.id} style={s.muted}>{m.title}: {t(`proj.stage.${m.status === "planned" || m.status === "ready" || m.status === "verified" ? m.status : "paid"}` as "proj.stage.paid")}</Text>)}
        </View>
      )}
      <View style={s.card}>
        <Text style={s.cardTitle}>{t("proj.timeline")}</Text>
        {p.timeline.map((e, k) => <Text key={k} style={s.muted}>{new Date(e.at).toLocaleDateString()} - {e.body ?? e.type}</Text>)}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  label: { color: colors.text, fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: colors.bgElevated, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  status: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  cta: { backgroundColor: colors.accent, borderRadius: 999, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  ctaText: { color: colors.accentForeground, fontWeight: "700", fontSize: 15 },
  ghost: { flex: 1, borderRadius: 999, minHeight: 44, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  ghostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  input: { backgroundColor: colors.bgElevated2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, minHeight: 40, alignItems: "center", justifyContent: "center" },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.accent },
  boxOn: { backgroundColor: colors.accent },
});
