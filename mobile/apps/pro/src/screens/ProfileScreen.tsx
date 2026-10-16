import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, StyleSheet, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as api from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button, Field } from "../components/ui";
import { Chip } from "../components/ds";
import { RangeSlider } from "../components/RangeSlider";
import { HeaderActions } from "../components/HeaderActions";
import { Icon } from "../components/Icon";
import { colors } from "../lib/theme";
import { enumLabel } from "../lib/status";
import { LANGUAGES, useI18n } from "../lib/i18n";
import { navigateRoot } from "../navigation/ref";
import { ReferralCard } from "../components/ReferralCard";
import { SupportRow } from "../components/AppNotices";
import { readIdCard, type IdOcr } from "../lib/idOcr";
import { useMarketConfig } from "../lib/market";

const QUIET_PRESETS: { label: string; start: number | null; end: number | null }[] = [
  { label: "", start: null, end: null },
  { label: "22:00 – 07:00", start: 22 * 60, end: 7 * 60 },
  { label: "23:00 – 06:00", start: 23 * 60, end: 6 * 60 },
];
const DAILY_CAPS = [5, 10, 20, 50];

function requestAccountDeletion(phone?: string) {
  const body = `Registered phone number/email:\n${phone ?? ""}\nAccount type (Customer/Pro): Pro\n`;
  Linking.openURL(
    `mailto:xpertserviz@gmail.com?subject=${encodeURIComponent("Servigic Account Deletion Request")}&body=${encodeURIComponent(body)}`
  );
}

const TRADES = [
  "PLUMBER",
  "ELECTRICIAN",
  "AC_TECHNICIAN",
  "SOLAR_INSTALLER",
  "CARPENTER",
  "PAINTER",
  "APPLIANCE_REPAIR",
  "CAR_MECHANIC",
  "MOVERS",
  "CLEANER",
  "MASON",
  "HANDYMAN",
];

export default function ProfileScreen() {
  const { t, td, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [trades, setTrades] = useState<string[]>([]); // approved + pending selection
  const [tradeRequests, setTradeRequests] = useState<api.TradeRequest[]>([]);
  const [radiusKm, setRadiusKm] = useState("10");
  const [coords, setCoords] = useState({ lat: 24.8607, lng: 67.0011 });
  const [cnicUrl, setCnicUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [policeCertUrl, setPoliceCertUrl] = useState("");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState(0);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [jobsCompleted, setJobsCompleted] = useState(0);
  const [editing, setEditing] = useState(false);
  const [ocr, setOcr] = useState<IdOcr | null>(null);
  const { config } = useMarketConfig();
  const [status, setStatus] = useState<api.ProviderStatus | null>(null);

  useEffect(() => {
    api
      .getProviderStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  async function saveAlerts(patch: Parameters<typeof api.updateAlertSettings>[0]) {
    if (!status) return;
    // Optimistic: flip the control immediately, roll back if the server says no.
    const prev = status;
    setStatus({
      ...status,
      alerts: {
        paused: patch.paused ?? status.alerts.paused,
        quietStartMin: patch.quietStartMin !== undefined ? patch.quietStartMin : status.alerts.quietStartMin,
        quietEndMin: patch.quietEndMin !== undefined ? patch.quietEndMin : status.alerts.quietEndMin,
        dailyCap: patch.dailyCap ?? status.alerts.dailyCap,
        emailAlerts: patch.emailAlerts ?? status.alerts.emailAlerts,
      },
    });
    try {
      const { alerts } = await api.updateAlertSettings(patch);
      setStatus((cur) => (cur ? { ...cur, alerts } : cur));
    } catch {
      setStatus(prev);
    }
  }

  useEffect(() => {
    api
      .getProviderProfile()
      .then(({ profile, tradeRequests: requests }) => {
        if (!profile) return;
        const p = profile as Record<string, unknown>;
        setDisplayName((p.displayName as string) ?? "");
        // The selection = approved trades plus the ones still waiting for approval.
        const pending = (requests ?? []).filter((r) => r.status === "PENDING").map((r) => r.trade);
        setTrades(Array.from(new Set([...((p.trades as string[]) ?? []), ...pending])));
        setTradeRequests(requests ?? []);
        setRadiusKm(String(p.serviceRadiusKm ?? 5));
        if (p.baseLat && p.baseLng) setCoords({ lat: p.baseLat as number, lng: p.baseLng as number });
        setCnicUrl((p.cnicUrl as string) ?? "");
        setSelfieUrl((p.selfieUrl as string) ?? "");
        setPoliceCertUrl((p.policeCertUrl as string) ?? "");
        setPayoutAccount((p.payoutAccount as string) ?? "");
        setVerificationLevel((p.verificationLevel as number) ?? 0);
        setRatingAvg((p.ratingAvg as number) ?? 0);
        setJobsCompleted((p.jobsCompleted as number) ?? 0);
      })
      .catch(() => {});
  }, []);

  const maxTrades = status?.limits.maxTrades ?? 3;
  const radiusMin = status?.limits.radiusMinKm ?? 2;
  const radiusMax = status?.limits.radiusMaxKm ?? 15;
  const radiusValue = Math.min(radiusMax, Math.max(radiusMin, Number(radiusKm) || status?.limits.radiusDefaultKm || 5));
  const requestOf = (trade: string) => tradeRequests.find((r) => r.trade === trade);

  function toggleTrade(trade: string) {
    setTrades((cur) => (cur.includes(trade) ? cur.filter((x) => x !== trade) : cur.length >= maxTrades ? cur : [...cur, trade]));
  }

  async function uploadCertificate(trade: string) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      const url = await api.uploadFile(asset.uri, asset.fileName ?? "certificate.jpg", asset.mimeType ?? "image/jpeg");
      await api.uploadTradeCertificate(trade, url);
      setTradeRequests((cur) => cur.map((r) => (r.trade === trade ? { ...r, certificateUploaded: true } : r)));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
    }
  }

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  async function pickDoc(setUrl: (url: string) => void, isCnic = false) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const [url, read] = await Promise.all([
      api.uploadFile(asset.uri, asset.fileName ?? "doc.jpg", asset.mimeType ?? "image/jpeg"),
      isCnic ? readIdCard(asset.uri) : Promise.resolve(null),
    ]);
    if (isCnic) setOcr(read);
    setUrl(url);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await api.updateProviderProfile({
        displayName,
        trades,
        serviceRadiusKm: radiusValue,
        baseLat: coords.lat,
        baseLng: coords.lng,
        cnicUrl: cnicUrl || undefined,
        selfieUrl: selfieUrl || undefined,
        policeCertUrl: policeCertUrl || undefined,
        payoutMethod: "EASYPAISA",
        payoutAccount,
        agreementAccepted: true,
        ...(ocr ? { cnicOcr: ocr } : {}),
      });
      if (res.tradeRequests) setTradeRequests(res.tradeRequests);
      if (res.profile.serviceRadiusKm != null) setRadiusKm(String(res.profile.serviceRadiusKm));
      setEditing(false);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setSaving(false);
    }
  }

  const docsDone = [cnicUrl, selfieUrl, policeCertUrl].filter(Boolean).length;
  const currentLanguage = LANGUAGES.find((l) => l.code === lang);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 + insets.bottom }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 23, fontWeight: "800", color: colors.text }}>{(user?.name ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: "800", color: colors.text }}>{user?.name}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 3 }}>
              {user?.phone} · {t("common.level", { n: verificationLevel })}
            </Text>
          </View>
        </View>
        <HeaderActions />
      </View>

      <View style={styles.chipRow}>
        {cnicUrl ? <DocChip label={t("account.cnic")} /> : null}
        {selfieUrl ? <DocChip label={t("account.selfie")} /> : null}
        {policeCertUrl ? <DocChip label={t("account.police")} /> : null}
        {status?.foundingPro ? <DocChip label={t("pro.foundingPro")} /> : null}
      </View>
      {status?.foundingPro && status.commissionFreeJobsLeft > 0 && (
        <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700", marginTop: 8 }}>
          {t("pro.freeJobsLeft", { n: status.commissionFreeJobsLeft })}
        </Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{ratingAvg.toFixed(1)}★</Text>
          <Text style={styles.statLabel}>{t("account.rating")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{jobsCompleted}</Text>
          <Text style={styles.statLabel}>{t("account.jobsDone")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{radiusKm}km</Text>
          <Text style={styles.statLabel}>{t("account.radius")}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t("account.trades")}</Text>
      <View style={styles.wrapRow}>
        {trades.length === 0 && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("account.noTrades")}</Text>}
        {trades.map((trade) => {
          const req = requestOf(trade);
          const pending = req?.status === "PENDING";
          return (
            <View key={trade} style={[styles.tradeChip, pending && { borderStyle: "dashed", opacity: 0.85 }]}>
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 11 }}>
                {enumLabel(td, "trade", trade)}
                {pending ? ` · ${t("trades.pending")}` : ""}
              </Text>
            </View>
          );
        })}
        {tradeRequests
          .filter((r) => r.status === "REJECTED")
          .map((r) => (
            <View key={r.trade} style={[styles.tradeChip, { borderColor: "rgba(226,87,76,0.4)", backgroundColor: "rgba(226,87,76,0.08)" }]}>
              <Text style={{ color: colors.dangerSoft, fontWeight: "700", fontSize: 11 }}>
                {enumLabel(td, "trade", r.trade)} · {t("trades.rejected")}
              </Text>
            </View>
          ))}
      </View>
      {tradeRequests
        .filter((r) => r.status === "PENDING" && r.certificateRequested)
        .map((r) => (
          <View key={`cert-${r.trade}`} style={styles.certCard}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
              {enumLabel(td, "trade", r.trade)}: {r.certificateUploaded ? t("trades.certUploaded") : t("trades.certNeeded")}
            </Text>
            {!!r.adminNote && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{r.adminNote}</Text>}
            {!r.certificateUploaded && (
              <Pressable onPress={() => uploadCertificate(r.trade)} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 13 }}>📷 {t("trades.uploadCert")}</Text>
              </Pressable>
            )}
          </View>
        ))}

      <View style={styles.verifyHeader}>
        <Text style={styles.sectionLabelInline}>{t("account.verifiedLevel", { n: verificationLevel })}</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{t("account.docsProgress", { done: docsDone, total: 3 })}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(docsDone / 3) * 100}%` }]} />
      </View>
      {!policeCertUrl && <Text style={styles.verifyHint}>{t("account.policeHint")}</Text>}

      <ReferralCard />

      {status && (
        <View style={styles.editCard}>
          <Text style={styles.sectionLabel}>{t("alerts.title")}</Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{t("alerts.pause")}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{t("alerts.pauseHint")}</Text>
            </View>
            <Switch
              value={status.alerts.paused}
              onValueChange={(v) => saveAlerts({ paused: v })}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>

          <View style={[styles.switchRow, { marginTop: 14 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{t("alerts.email")}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{t("alerts.emailHint")}</Text>
            </View>
            <Switch
              value={status.alerts.emailAlerts}
              onValueChange={(v) => saveAlerts({ emailAlerts: v })}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{t("alerts.quiet")}</Text>
          <View style={styles.wrapRow}>
            {QUIET_PRESETS.map((q) => (
              <Chip
                key={q.label || "off"}
                label={q.label || t("alerts.quietOff")}
                active={status.alerts.quietStartMin === q.start && status.alerts.quietEndMin === q.end}
                onPress={() => saveAlerts({ quietStartMin: q.start, quietEndMin: q.end })}
              />
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{t("alerts.dailyCap")}</Text>
          <View style={styles.wrapRow}>
            {DAILY_CAPS.map((n) => (
              <Chip key={n} label={String(n)} active={status.alerts.dailyCap === n} onPress={() => saveAlerts({ dailyCap: n })} />
            ))}
          </View>

          <Pressable onPress={() => navigateRoot("NeverMiss")} style={[styles.row, { marginTop: 16 }]}>
            <Text style={styles.rowText}>🔔 {t("neverMiss.title")}</Text>
            <Icon name="chevron-right" size={14} color={colors.textFaint} />
          </Pressable>
        </View>
      )}

      <SupportRow rowStyle={styles.row} textStyle={styles.rowText} />

      <Pressable onPress={() => navigateRoot("Language")} style={styles.row}>
        <Icon name="globe" size={18} />
        <Text style={styles.rowText}>{t("lang.title")}</Text>
        <Text style={styles.rowValue}>{currentLanguage?.native}</Text>
        <Icon name="chevron-right" size={14} color={colors.textFaint} />
      </Pressable>

      <Pressable onPress={() => setEditing((v) => !v)} style={styles.row}>
        <Icon name="account" size={18} />
        <Text style={styles.rowText}>{t("account.editProfile")}</Text>
        <Icon name="chevron-right" size={14} color={colors.textFaint} />
      </Pressable>

      {editing && (
        <View style={styles.editCard}>
          <Field label={t("account.displayName")} value={displayName} onChangeText={setDisplayName} />

          <Text style={styles.fieldLabel}>{t("account.trades")}</Text>
          <View style={[styles.wrapRow, { marginBottom: 16 }]}>
            {TRADES.map((trade) => {
              // A trade that is switched off in this market can be kept if already chosen, but not newly added.
              const off = config != null && !config.legacyOpen && config.trades[trade] === false && !trades.includes(trade);
              // At the cap, unselected trades are locked until one is removed.
              const full = !trades.includes(trade) && trades.length >= maxTrades;
              const pending = requestOf(trade)?.status === "PENDING";
              const base = enumLabel(td, "trade", trade);
              return (
                <Chip
                  key={trade}
                  label={off ? `${base} · ${t("market.comingSoon")}` : pending ? `${base} · ${t("trades.pending")}` : base}
                  active={trades.includes(trade)}
                  onPress={() => (off || full ? undefined : toggleTrade(trade))}
                />
              );
            })}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: -8, marginBottom: 14 }}>
            {t("trades.limit", { n: maxTrades })} {trades.length >= maxTrades ? t("trades.full") : ""}
          </Text>
          {config != null && !config.legacyOpen && TRADES.some((x) => config.trades[x] === false) && (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: -8, marginBottom: 14 }}>{t("pro.tradesComingSoon")}</Text>
          )}

          <Text style={styles.fieldLabel}>{t("profile.radiusSlider", { n: radiusValue })}</Text>
          <RangeSlider min={radiusMin} max={radiusMax} value={radiusValue} onChange={(v) => setRadiusKm(String(v))} />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 14 }}>{t("profile.radiusHint")}</Text>

          <Pressable onPress={useMyLocation} style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.accent, fontWeight: "700" }}>📍 {t("account.useLocation")}</Text>
          </Pressable>

          <View style={{ gap: 12, marginBottom: 16 }}>
            <Pressable onPress={() => pickDoc(setCnicUrl, true)}>
              <Text style={{ color: cnicUrl ? colors.secondary : colors.accent, fontWeight: "700" }}>{cnicUrl ? t("account.cnicDone") : t("account.uploadCnic")}</Text>
            </Pressable>
            <Pressable onPress={() => pickDoc(setSelfieUrl)}>
              <Text style={{ color: selfieUrl ? colors.secondary : colors.accent, fontWeight: "700" }}>{selfieUrl ? t("account.selfieDone") : t("account.uploadSelfie")}</Text>
            </Pressable>
            <Pressable onPress={() => pickDoc(setPoliceCertUrl)}>
              <Text style={{ color: policeCertUrl ? colors.secondary : colors.accent, fontWeight: "700" }}>
                {policeCertUrl ? t("account.policeDone") : t("account.uploadPolice")}
              </Text>
            </Pressable>
          </View>

          <Field label={t("account.payoutAccount")} value={payoutAccount} onChangeText={setPayoutAccount} />
          <Button title={t("account.save")} onPress={save} loading={saving} />
        </View>
      )}

      <Text style={[styles.sectionLabel, { marginTop: 26 }]}>{t("account.legal")}</Text>
      <Pressable onPress={() => Linking.openURL("https://www.servigic.com/privacy-policy.html")}>
        <Text style={styles.legalLink}>{t("account.privacy")}</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openURL("https://www.servigic.com/delete-account.html")}>
        <Text style={styles.legalLink}>{t("account.deleteHow")}</Text>
      </Pressable>

      <View style={{ marginTop: 16, gap: 12 }}>
        <Button title={t("account.logOut")} variant="danger" onPress={signOut} />
        <Button title={t("account.deleteAccount")} variant="ghost" onPress={() => requestAccountDeletion(user?.phone)} />
      </View>
    </ScrollView>
  );
}

function DocChip({ label }: { label: string }) {
  return (
    <View style={styles.docChip}>
      <Icon name="check" size={11} color={colors.accent} strokeWidth={3} />
      <Text style={{ color: colors.accent, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(245,166,35,0.16)", borderWidth: 1, borderColor: colors.accentBorder, alignItems: "center", justifyContent: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, marginBottom: 2 },
  docChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(245,166,35,0.12)", borderWidth: 1, borderColor: "rgba(245,166,35,0.3)", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  statsRow: { flexDirection: "row", gap: 10, marginVertical: 18 },
  stat: { flex: 1, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 13, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#D9D2C4", marginBottom: 10 },
  sectionLabelInline: { fontSize: 13, fontWeight: "700", color: "#D9D2C4" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tradeChip: { backgroundColor: "rgba(245,166,35,0.12)", borderWidth: 1, borderColor: "rgba(245,166,35,0.25)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  verifyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  verifyHint: { fontSize: 11, color: "#8A8378", marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginTop: 12,
  },
  rowText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  rowValue: { color: colors.textMuted, fontSize: 13 },
  editCard: { marginTop: 12, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 16, padding: 16 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 8 },
  certCard: { marginTop: 10, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 12, padding: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  legalLink: { color: colors.text, fontSize: 14, paddingVertical: 8 },
});
