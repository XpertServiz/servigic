import React, { useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as api from "../lib/api";
import { Button, Field } from "../components/ui";
import { colors, radius } from "../lib/theme";
import { enumLabel } from "../lib/status";
import { useI18n } from "../lib/i18n";

const METHODS = ["JAZZCASH", "EASYPAISA", "BANK_TRANSFER"] as const;

export function TopUpSheet({ visible, onClose, onSubmitted }: { visible: boolean; onClose: () => void; onSubmitted: () => void }) {
  const insets = useSafeAreaInsets();
  const { t, td } = useI18n();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("EASYPAISA");
  const [proofUrl, setProofUrl] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickProof() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    setError(null);
    try {
      const url = await api.uploadFile(asset.uri, asset.fileName ?? "topup-proof.jpg", asset.mimeType ?? "image/jpeg");
      setProofUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const amountPKR = Number(amount);
    if (!amountPKR || amountPKR <= 0 || !proofUrl || reference.trim().length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await api.submitTopUp(amountPKR, method, proofUrl, reference.trim());
      setAmount("");
      setProofUrl("");
      setReference("");
      onSubmitted();
      onClose();
    } catch (e) {
      // e.g. the transaction id was already used, or the server rejected the proof
      setError(e instanceof api.ApiError && e.code === "DUPLICATE_REFERENCE" ? t("topup.duplicate") : e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }} behavior="padding">
        <ScrollView
          style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: "85%" }}
          contentContainerStyle={{ padding: 20, paddingBottom: 20 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 16 }}>{t("topup.title")}</Text>

          <Field label={t("topup.amount")} keyboardType="number-pad" value={amount} onChangeText={setAmount} placeholder="1000" />

          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 8 }}>{t("topup.method")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {METHODS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={{
                  borderWidth: 1,
                  borderColor: method === m ? colors.accent : "rgba(255,255,255,0.1)",
                  backgroundColor: method === m ? colors.accentTint : "transparent",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: method === m ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: "600" }}>{enumLabel(td, "method", m)}</Text>
              </Pressable>
            ))}
          </View>

          <Field label={t("topup.reference")} value={reference} onChangeText={setReference} autoCapitalize="characters" placeholder={t("topup.referencePlaceholder")} />

          {proofUrl ? (
            <Text style={{ color: colors.secondary, marginBottom: 12 }}>{t("topup.proofUploaded")}</Text>
          ) : (
            <Pressable onPress={pickProof} disabled={uploading} style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>{uploading ? "…" : `📷 ${t("topup.uploadProof")}`}</Text>
            </Pressable>
          )}
          <Text style={{ color: colors.textMuted, fontSize: 11.5, lineHeight: 16, marginBottom: 14 }}>{t("topup.proofRequiredHint")}</Text>
          {error && <Text style={{ color: colors.dangerSoft, fontSize: 13, marginBottom: 10 }}>{error}</Text>}

          <Button title={t("topup.submit")} onPress={submit} loading={busy} disabled={!amount || !proofUrl || reference.trim().length < 6} />
          <View style={{ marginTop: 10 }}>
            <Button title={t("common.cancel")} variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
