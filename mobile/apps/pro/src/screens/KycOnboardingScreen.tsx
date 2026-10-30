import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as api from "../lib/api";
import { countryWord, useMarketConfig } from "../lib/market";
import { Button } from "../components/ui";
import { GlowBackground } from "../components/ds";
import { HeaderActions } from "../components/HeaderActions";
import { Icon } from "../components/Icon";
import { colors } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { readIdCard, looksLikeIdDocument, type IdOcr } from "../lib/idOcr";
import { useI18n, useT } from "../lib/i18n";
import { countryFromPhone, idDocKind } from "../lib/idDoc";
import { SelfieCaptureModal } from "../components/SelfieCaptureModal";

export default function KycOnboardingScreen({ onSubmitted, rejectedReason }: { onSubmitted: () => void; rejectedReason?: string | null }) {
  const { config: marketCfg } = useMarketConfig();
  const { lang: kycLang } = useI18n();
  const words = { id: countryWord(marketCfg, "id", kycLang, "ID"), police: countryWord(marketCfg, "police", kycLang, "police certificate") };
  const t = useT();
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();

  const [cnicUrl, setCnicUrl] = useState("");
  const [cnicBackUrl, setCnicBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [selfieOpen, setSelfieOpen] = useState(false);
  const docName = t(`signup.doc.${idDocKind(countryFromPhone((user as { phone?: string } | null)?.phone))}` as "signup.doc.id");
  const [policeCertUrl, setPoliceCertUrl] = useState("");
  const [photoConsent, setPhotoConsent] = useState(false);
  // Keep what he already uploaded (for example a front photo from before the back was required): only the missing part is asked for.
  React.useEffect(() => {
    api
      .getProviderProfile()
      .then(({ profile }) => {
        const p = (profile ?? {}) as Record<string, unknown>;
        if (typeof p.cnicUrl === "string" && p.cnicUrl) setCnicUrl(p.cnicUrl);
        if (typeof p.cnicBackUrl === "string" && p.cnicBackUrl) setCnicBackUrl(p.cnicBackUrl);
        if (typeof p.selfieUrl === "string" && p.selfieUrl) setSelfieUrl(p.selfieUrl);
      })
      .catch(() => {});
  }, []);
  const [ocr, setOcr] = useState<IdOcr | null>(null);
  const [busy, setBusy] = useState<"cnic" | "cnicBack" | "selfie" | "police" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickDoc(kind: "cnic" | "cnicBack" | "selfie" | "police", setUrl: (url: string) => void) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    if ((kind === "cnic" || kind === "cnicBack") && !(await looksLikeIdDocument(result.assets[0].uri, kind === "cnic" ? "front" : "back"))) {
      setError(t("signup.notAnId"));
      return;
    }
    await uploadAsset(kind, result.assets[0], setUrl);
  }

  async function uploadAsset(kind: "cnic" | "cnicBack" | "selfie" | "police", asset: { uri: string; fileName?: string | null; mimeType?: string | null }, setUrl: (url: string) => void) {
    setBusy(kind);
    setError(null);
    try {
      // Read the ID on-device while it uploads: it only pre-fills the reviewer's
      // screen. A person still approves every Pro.
      const [url, read] = await Promise.all([
        api.uploadFile(asset.uri, asset.fileName ?? "doc.jpg", asset.mimeType ?? "image/jpeg"),
        kind === "cnic" ? readIdCard(asset.uri) : Promise.resolve(null),
      ]);
      if (kind === "cnic") setOcr(read);
      setUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("kyc.uploadFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setBusy("submit");
    setError(null);
    try {
      await api.updateProviderProfile({
        cnicUrl,
        ...(cnicBackUrl ? { cnicBackUrl } : {}),
        selfieUrl,
        policeCertUrl: policeCertUrl || undefined,
        agreementAccepted: true,
        photoConsentPublic: photoConsent,
        ...(ocr ? { cnicOcr: ocr } : {}),
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("kyc.submitFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GlowBackground cy="12%" opacity={0.13} />
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <HeaderActions showBell={false} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 64 }]}>
        <Image source={require("../../assets/face/pro.webp")} style={{ width: "100%", height: 150, borderRadius: 16, marginBottom: 14 }} resizeMode="cover" />
        <Text style={styles.title}>{t("kyc.title")}</Text>
        <Text style={styles.subtitle}>{t("kyc.subtitle")}</Text>

        {!!rejectedReason && (
          <View style={styles.rejected}>
            <Text style={styles.rejectedTitle}>{t("verify.rejectedTitle")}</Text>
            <Text style={styles.rejectedBody}>{rejectedReason}</Text>
          </View>
        )}

        <DocRow label={t("signup.idFront", { doc: docName })} done={Boolean(cnicUrl)} loading={busy === "cnic"} onPress={() => pickDoc("cnic", setCnicUrl)} />
        <DocRow label={t("signup.idBack", { doc: docName })} done={Boolean(cnicBackUrl)} loading={busy === "cnicBack"} onPress={() => pickDoc("cnicBack", setCnicBackUrl)} />
        <DocRow label={t("kyc.selfie")} done={Boolean(selfieUrl)} loading={busy === "selfie"} onPress={() => setSelfieOpen(true)} />
        <SelfieCaptureModal visible={selfieOpen} onClose={() => setSelfieOpen(false)} onPicked={(uri) => uploadAsset("selfie", { uri }, setSelfieUrl)} />
        <DocRow label={t("kyc.police", words)} done={Boolean(policeCertUrl)} loading={busy === "police"} onPress={() => pickDoc("police", setPoliceCertUrl)} />

        {ocr?.idNumber ? <Text style={styles.ocrNote}>{t("kyc.ocrRead", { id: ocr.idNumber })}</Text> : null}

        <Pressable onPress={() => setPhotoConsent((v) => !v)} style={styles.consentRow}>
          <View style={[styles.checkbox, photoConsent && styles.checkboxChecked]}>
            {photoConsent && <Icon name="check" size={13} color={colors.accentForeground} />}
          </View>
          <Text style={styles.consentText}>{t("kyc.consent")}</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ marginTop: 20, width: "100%" }}>
          <Button title={busy === "submit" ? t("kyc.submitting") : t("kyc.submit")} onPress={submit} loading={busy === "submit"} disabled={!cnicUrl || !cnicBackUrl || !selfieUrl} />
        </View>

        <Pressable onPress={signOut} style={{ marginTop: 20 }}>
          <Text style={styles.signOut}>{t("kyc.notReady")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DocRow({ label, done, loading, onPress }: { label: string; done: boolean; loading: boolean; onPress: () => void }) {
  const t = useT();
  return (
    <Pressable onPress={onPress} disabled={loading} style={styles.docRow}>
      <Text style={styles.docLabel}>{label}</Text>
      <Text style={[styles.docStatus, done && styles.docStatusDone]}>{loading ? t("kyc.uploading") : done ? t("kyc.uploaded") : t("kyc.upload")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", right: 18, zIndex: 5 },
  content: { flexGrow: 1, alignItems: "center", padding: 24, gap: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: 12, maxWidth: 320, lineHeight: 20 },
  docRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.18)",
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  docLabel: { color: colors.text, fontSize: 14, fontWeight: "600", flex: 1, paddingRight: 8 },
  docStatus: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  docStatusDone: { color: colors.secondary },
  consentRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: "#4A443A", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  consentText: { color: colors.textMuted, fontSize: 12, flex: 1, lineHeight: 17 },
  error: { color: colors.dangerSoft, marginTop: 4, textAlign: "center" },
  rejected: { width: "100%", backgroundColor: colors.dangerTint, borderWidth: 1, borderColor: "rgba(220,60,60,0.35)", borderRadius: 12, padding: 14 },
  rejectedTitle: { color: colors.dangerSoft, fontWeight: "800", fontSize: 13 },
  rejectedBody: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  ocrNote: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
  signOut: { color: colors.textMuted, fontWeight: "600", fontSize: 13, textAlign: "center" },
});
