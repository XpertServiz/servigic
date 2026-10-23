// Accept-and-sign block for sign-up (and for the gate shown to existing accounts): the key points of the Customer Terms or Pro
// Agreement for the user's country, the full text in a sheet, an "I agree" box and the full name typed as the electronic
// signature. Shared by apps/customer and apps/pro.
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
  const [agreed, setAgreed] = useState(false);
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
    onChange(doc && agreed && signature.trim().length >= 2 ? { version: doc.version, hash: doc.hash, signedName: signature.trim(), locale: lang } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, agreed, signature, lang]);

  if (!doc) return <View style={[styles.box, { height: 90 }]} />;

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>{"📝 " + t("legal.heading")}</Text>
      <Text style={styles.title}>{doc.title}</Text>
      {doc.summary.map((s) => (
        <Text key={s} style={styles.point}>
          {"•  " + s}
        </Text>
      ))}
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <Text style={styles.link}>{t("legal.readFull")}</Text>
      </Pressable>
      {lang !== "en" && <Text style={styles.note}>{t("legal.englishNote")}</Text>}

      <Pressable onPress={() => setAgreed((a) => !a)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
        <View style={[styles.check, agreed && styles.checkOn]}>{agreed && <Text style={styles.tick}>✓</Text>}</View>
        <Text style={styles.checkText}>{t("legal.agree", { title: doc.title })}</Text>
      </Pressable>

      <Text style={styles.label}>{t("legal.signLabel")}</Text>
      <TextInput value={signature} onChangeText={setSigOverride} style={styles.sign} autoCapitalize="words" placeholderTextColor={colors.textFainter} />
      <Text style={styles.note}>{t("legal.signNote")}</Text>

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
  point: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 3 },
  link: { color: colors.accent, fontWeight: "700", fontSize: 13, marginTop: 6 },
  note: { color: colors.textFainter, fontSize: 11, lineHeight: 15, marginTop: 6 },
  checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 12 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.accentBorder, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tick: { color: "#111", fontWeight: "900", fontSize: 14 },
  checkText: { color: colors.text, fontSize: 12.5, lineHeight: 17, flex: 1 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  sign: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 18, fontStyle: "italic", backgroundColor: colors.bg },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderSoft },
  sheetTitle: { color: colors.text, fontWeight: "800", fontSize: 15, flex: 1, marginRight: 12 },
  docTitle: { color: colors.text, fontWeight: "800", fontSize: 18 },
  docVersion: { color: colors.textFainter, fontSize: 11, marginBottom: 14 },
  secTitle: { color: colors.text, fontWeight: "800", fontSize: 14, marginBottom: 4 },
  para: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 6 },
});
