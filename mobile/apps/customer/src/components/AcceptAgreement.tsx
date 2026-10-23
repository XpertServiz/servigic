// Accept-and-sign step of sign-up (and of the gate shown to existing accounts). The person reads the complete Customer Terms or
// Pro Agreement of their country, then taps "I Agree" or "I Don't Agree" at the end of it. Only "I Agree" plus the full name
// typed as the electronic signature lets the account be created. Shared by apps/customer and apps/pro.
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";

export type TermsAcceptance = { version: string; hash: string; signedName: string; locale: string };

export function AgreementText({ doc }: { doc: api.AgreementDoc }) {
  return (
    <View>
      <Text style={styles.docTitle}>{doc.title}</Text>
      <Text style={styles.docVersion}>Version {doc.version}</Text>
      <View style={styles.keyBox}>
        {doc.summary.map((s) => (
          <Text key={s} style={styles.point}>
            {"•  " + s}
          </Text>
        ))}
      </View>
      {doc.sections.map((s) => (
        <View key={s.title} style={{ marginBottom: 12 }}>
          <Text style={styles.secTitle}>{s.title}</Text>
          {s.paragraphs.map((p, i) => (
            <Text key={i} style={styles.para}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function AcceptAgreement({
  role,
  country,
  name,
  onChange,
  preloaded,
}: {
  role: "CUSTOMER" | "PROVIDER";
  country?: string | null;
  name: string;
  onChange: (value: TermsAcceptance | null) => void;
  preloaded?: api.AgreementDoc | null;
}) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<api.AgreementDoc | null>(preloaded ?? null);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"agree" | "disagree" | null>(null);
  const [sigOverride, setSigOverride] = useState<string | null>(null);
  const signature = sigOverride ?? name;

  useEffect(() => {
    if (preloaded) return;
    let alive = true;
    api
      .getAgreement(role, country ?? undefined)
      .then((d) => alive && setDoc(d.agreement))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [role, country, preloaded]);

  useEffect(() => {
    onChange(doc && decision === "agree" && signature.trim().length >= 2 ? { version: doc.version, hash: doc.hash, signedName: signature.trim(), locale: lang } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, decision, signature, lang]);

  if (!doc) return <View style={[styles.box, { height: 90 }]} />;

  function decide(d: "agree" | "disagree") {
    setDecision(d);
    setOpen(false);
  }

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>{"📝 " + t("legal.heading")}</Text>
      <Text style={styles.title}>{doc.title}</Text>

      {decision === null && (
        <>
          <Text style={styles.note}>{t("legal.readToContinue")}</Text>
          <Pressable onPress={() => setOpen(true)} style={styles.readBtn}>
            <Text style={styles.readBtnText}>{t("legal.readFull")}</Text>
          </Pressable>
        </>
      )}

      {decision === "disagree" && (
        <>
          <Text style={[styles.note, { color: colors.dangerSoft }]}>{t("legal.disagreed")}</Text>
          <Pressable onPress={() => setOpen(true)} style={styles.readBtn}>
            <Text style={styles.readBtnText}>{t("legal.readAgain")}</Text>
          </Pressable>
        </>
      )}

      {decision === "agree" && (
        <>
          <Text style={[styles.note, { color: colors.success, fontWeight: "700" }]}>{"✓ " + t("legal.agreed", { title: doc.title })}</Text>
          <Text style={styles.label}>{t("legal.signLabel")}</Text>
          <TextInput value={signature} onChangeText={setSigOverride} style={styles.sign} autoCapitalize="words" placeholderTextColor={colors.textFainter} />
          <Text style={styles.note}>{t("legal.signNote")}</Text>
          <Pressable onPress={() => setOpen(true)} hitSlop={8}>
            <Text style={styles.link}>{t("legal.readAgain")}</Text>
          </Pressable>
        </>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {doc.title}
            </Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={styles.link}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 + insets.bottom }}>
            <AgreementText doc={doc} />
            {lang !== "en" && <Text style={[styles.note, { marginBottom: 10 }]}>{t("legal.englishNote")}</Text>}
            <View style={styles.decisionBox}>
              <Text style={styles.decisionText}>{t("legal.agree", { title: doc.title })}</Text>
              <Pressable onPress={() => decide("agree")} style={styles.agreeBtn} accessibilityRole="button">
                <Text style={styles.agreeText}>{t("legal.iAgree")}</Text>
              </Pressable>
              <Pressable onPress={() => decide("disagree")} style={styles.disagreeBtn} accessibilityRole="button">
                <Text style={styles.disagreeText}>{t("legal.iDisagree")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.bgElevated, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, padding: 14, marginBottom: 14 },
  heading: { color: colors.text, fontWeight: "800", fontSize: 13.5, marginBottom: 6 },
  title: { color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: 6 },
  keyBox: { backgroundColor: colors.accentTint, borderRadius: 10, padding: 10, marginBottom: 14 },
  point: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginBottom: 3 },
  link: { color: colors.accent, fontWeight: "700", fontSize: 13, marginTop: 8 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  readBtn: { marginTop: 10, borderWidth: 1.5, borderColor: colors.accent, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  readBtnText: { color: colors.accent, fontWeight: "800", fontSize: 14 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  sign: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 18, fontStyle: "italic", backgroundColor: colors.bg },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderSoft },
  sheetTitle: { color: colors.text, fontWeight: "800", fontSize: 15, flex: 1, marginRight: 12 },
  docTitle: { color: colors.text, fontWeight: "800", fontSize: 18 },
  docVersion: { color: colors.textFainter, fontSize: 11, marginBottom: 14 },
  secTitle: { color: colors.text, fontWeight: "800", fontSize: 14, marginBottom: 4 },
  para: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  decisionBox: { marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.bgElevated, gap: 10 },
  decisionText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  agreeBtn: { backgroundColor: colors.success, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  agreeText: { color: "#06140e", fontWeight: "900", fontSize: 15 },
  disagreeBtn: { borderWidth: 1.5, borderColor: colors.dangerSoft, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  disagreeText: { color: colors.dangerSoft, fontWeight: "800", fontSize: 14 },
});
