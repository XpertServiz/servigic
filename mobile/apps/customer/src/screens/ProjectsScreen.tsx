// Big Projects (whole-house wiring, plumbing...): my requests, a new request, and the detail with the estimate to accept.
// Customer app only. No ads on this screen.
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as api from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import { Icon } from "../components/Icon";

const TRADES: [string, string][] = [["electrical", "Electrical wiring"], ["plumbing", "Plumbing"], ["painting", "Painting"], ["carpentry", "Carpentry"], ["tiling", "Tiling and flooring"], ["false_ceiling", "False ceiling"], ["renovation", "Full renovation"], ["hvac", "AC / HVAC"], ["solar", "Solar"], ["cctv", "CCTV and security"], ["other", "Other"]];
const BUDGETS: [string, string][] = [["u1", "Under 1 lakh"], ["1-2", "1-2 lakh"], ["2-5", "2-5 lakh"], ["5-10", "5-10 lakh"], ["10p", "10 lakh +"], ["unsure", "Not sure"]];
const STATUS_TEXT: Record<string, string> = {
  new: "Received", contacted: "We called you", site_visit_scheduled: "Site visit scheduled", estimate_sent: "Estimate ready", negotiating: "Discussing changes", accepted: "Accepted",
  pros_assigned: "Team assigned", in_progress: "Work in progress", completed: "Completed", on_hold: "On hold", lost: "Closed", cancelled: "Cancelled",
};
const tradeName = (k: string) => TRADES.find(([x]) => x === k)?.[1] ?? k;
const money = (n: number, c: string) => `${c} ${Math.round(n).toLocaleString("en-US")}`;

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [mode, setMode] = useState<"list" | "new" | "detail">("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const back = () => (mode === "list" ? navigation.goBack() : (setMode("list"), setOpenId(null)));
  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.header}>
        <Pressable onPress={back} style={s.back} accessibilityLabel="Back"><Icon name="back" size={16} /></Pressable>
        <Text style={s.title}>Big Projects</Text>
      </View>
      {mode === "list" && <List onNew={() => setMode("new")} onOpen={(id) => { setOpenId(id); setMode("detail"); }} />}
      {mode === "new" && <NewRequest onDone={(id) => { setOpenId(id); setMode("detail"); }} />}
      {mode === "detail" && openId && <Detail id={openId} />}
    </View>
  );
}

function List({ onNew, onOpen }: { onNew: () => void; onOpen: (id: string) => void }) {
  const [items, setItems] = useState<api.BigProjectListItem[] | null>(null);
  useFocusEffect(useCallback(() => { api.getMyProjects().then((r) => setItems(r.projects)).catch(() => setItems([])); }, []));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={s.muted}>Building or renovating? We call you, visit your site free, give you one clear amount in writing, and verified pros do the work.</Text>
      <Pressable onPress={onNew} style={s.cta}><Text style={s.ctaText}>Get a free estimate</Text></Pressable>
      {items === null && <ActivityIndicator color={colors.accent} />}
      {items?.map((p) => (
        <Pressable key={p.id} onPress={() => onOpen(p.id)} style={s.card}>
          <Text style={s.cardTitle}>{p.reference}</Text>
          <Text style={s.muted}>{p.trades.map(tradeName).join(", ")} - {[p.area, p.city].filter(Boolean).join(", ")}</Text>
          <Text style={s.status}>{STATUS_TEXT[p.status] ?? p.status}{p.contractAmount ? `  -  ${money(p.contractAmount, p.currency)}` : ""}</Text>
        </Pressable>
      ))}
      {items?.length === 0 && <Text style={s.muted}>No projects yet.</Text>}
    </ScrollView>
  );
}

function NewRequest({ onDone }: { onDone: (id: string) => void }) {
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
    if (trades.length === 0) return Alert.alert("Pick at least one trade.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert("Please enter your email so we can send your estimate.");
    if (!consent) return Alert.alert("Please tick the box so we may contact you.");
    setBusy(true);
    try {
      const r = await api.createProject({ trades, city: city.trim(), area: area.trim() || undefined, name: name.trim(), phone: phone.trim(), email: email.trim(), budgetBand: budget || undefined, notes: notes.trim() || undefined, preferredContact: "both", bestTime: "anytime", consent: true });
      Alert.alert("Thank you", `Your reference is ${r.reference}. A Servigic specialist will call you within 2 working hours.`);
      onDone(r.id);
    } catch (e) {
      Alert.alert("Could not send", e instanceof Error ? e.message : "Please check the details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>What do you need done?</Text>
      <View style={s.chips}>{TRADES.map(([k, l]) => <Pressable key={k} onPress={() => toggle(k)} style={[s.chip, trades.includes(k) && s.chipOn]}><Text style={[s.chipText, trades.includes(k) && { color: colors.accent }]}>{l}</Text></Pressable>)}</View>
      <TextInput style={s.input} placeholder="City" placeholderTextColor={colors.textFaint} value={city} onChangeText={setCity} />
      <TextInput style={s.input} placeholder="Area / society" placeholderTextColor={colors.textFaint} value={area} onChangeText={setArea} />
      <TextInput style={s.input} placeholder="Your name" placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} />
      <TextInput style={s.input} placeholder="Mobile number" placeholderTextColor={colors.textFaint} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={s.input} placeholder="Email (we send your estimate here)" placeholderTextColor={colors.textFaint} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Text style={s.label}>Budget (optional)</Text>
      <View style={s.chips}>{BUDGETS.map(([k, l]) => <Pressable key={k} onPress={() => setBudget(budget === k ? "" : k)} style={[s.chip, budget === k && s.chipOn]}><Text style={[s.chipText, budget === k && { color: colors.accent }]}>{l}</Text></Pressable>)}</View>
      <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} placeholder="Anything else we should know" placeholderTextColor={colors.textFaint} value={notes} onChangeText={setNotes} multiline maxLength={1000} />
      <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={[s.box, consent && s.boxOn]} /><Text style={[s.muted, { flex: 1 }]}>I agree that Servigic may contact me about this request.</Text>
      </Pressable>
      <Pressable onPress={submit} disabled={busy} style={[s.cta, busy && { opacity: 0.6 }]}><Text style={s.ctaText}>{busy ? "Sending..." : "Get free estimate"}</Text></Pressable>
    </ScrollView>
  );
}

function Detail({ id }: { id: string }) {
  const [p, setP] = useState<api.BigProjectDetail | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.getProject(id).then((r) => setP(r.project)).catch(() => null); }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!p) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  const est = p.estimate?.status === "sent" ? p.estimate : null;

  async function answer(action: "accept" | "revise" | "decline") {
    if (action === "revise" && !comment.trim()) return Alert.alert("Please write what should change.");
    setBusy(true);
    try { await api.answerProjectEstimate(id, action, comment.trim() || undefined); setComment(""); load(); }
    catch (e) { Alert.alert("Could not send", e instanceof Error ? e.message : "Try again."); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={s.cardTitle}>{p.reference}</Text>
      <Text style={s.status}>{STATUS_TEXT[p.status] ?? p.status}</Text>
      <Text style={s.muted}>{p.trades.map(tradeName).join(", ")} - {[p.area, p.city].filter(Boolean).join(", ")}</Text>
      {p.siteVisitAt && <Text style={s.muted}>Site visit: {new Date(p.siteVisitAt).toLocaleString()}</Text>}

      {p.estimate && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Estimate v{p.estimate.version}: {money(p.estimate.total, p.estimate.currency)}</Text>
          {p.estimate.items.map((i, k) => <Text key={k} style={s.muted}>{i.description} - {i.qty} {i.unit} x {money(i.unitPrice, p.estimate!.currency)} ({i.materialsBy === "customer" ? "materials by you" : "materials by Servigic"})</Text>)}
          {p.estimate.terms ? <Text style={s.muted}>{p.estimate.terms}</Text> : null}
          <Text style={s.muted}>Any problem within {p.warrantyDays} days, Servigic comes back and fixes it.</Text>
          <Pressable onPress={() => Linking.openURL(p.estimate!.link)}><Text style={{ color: colors.accent }}>Open / print the estimate</Text></Pressable>
          {est ? (
            <>
              <TextInput style={s.input} placeholder="Comment (needed to ask for changes)" placeholderTextColor={colors.textFaint} value={comment} onChangeText={setComment} multiline />
              <Pressable disabled={busy} onPress={() => answer("accept")} style={s.cta}><Text style={s.ctaText}>Accept</Text></Pressable>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable disabled={busy} onPress={() => answer("revise")} style={s.ghost}><Text style={s.ghostText}>Ask for changes</Text></Pressable>
                <Pressable disabled={busy} onPress={() => answer("decline")} style={s.ghost}><Text style={s.ghostText}>Decline</Text></Pressable>
              </View>
            </>
          ) : <Text style={s.status}>You answered: {p.estimate.status.replace("_", " ")}</Text>}
        </View>
      )}

      {p.team.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Your team</Text>
          {p.team.map((t, k) => <Text key={k} style={s.muted}>{t.name} - {t.trades.map(tradeName).join(", ")}{t.verified ? " (verified)" : ""}</Text>)}
        </View>
      )}
      {p.milestones.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Progress</Text>
          {p.milestones.map((m) => <Text key={m.id} style={s.muted}>{m.title}: {m.status === "planned" ? "planned" : m.status === "ready" ? "ready for approval" : m.status === "verified" ? "approved" : "complete"}</Text>)}
        </View>
      )}
      <View style={s.card}>
        <Text style={s.cardTitle}>Timeline</Text>
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
