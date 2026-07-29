import React, { useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as api from "../lib/api";
import { Button, Field } from "../components/ui";
import { colors, radius } from "../lib/theme";

const METHODS = ["JAZZCASH", "EASYPAISA", "BANK_TRANSFER"] as const;

export function TopUpSheet({ visible, onClose, onSubmitted }: { visible: boolean; onClose: () => void; onSubmitted: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("EASYPAISA");
  const [proofUrl, setProofUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function pickProof() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const url = await api.uploadFile(asset.uri, asset.fileName ?? "topup-proof.jpg", asset.mimeType ?? "image/jpeg");
    setProofUrl(url);
  }

  async function submit() {
    const amountPKR = Number(amount);
    if (!amountPKR || amountPKR <= 0) return;
    setBusy(true);
    try {
      await api.submitTopUp(amountPKR, method, proofUrl || undefined);
      setAmount("");
      setProofUrl("");
      onSubmitted();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <ScrollView
          style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, maxHeight: "85%" }}
          contentContainerStyle={{ padding: 20 }}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 16 }}>Top Up Wallet</Text>

          <Field label="Amount (PKR)" keyboardType="number-pad" value={amount} onChangeText={setAmount} placeholder="1000" />

          <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>Method</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {METHODS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={{
                  borderWidth: 1,
                  borderColor: method === m ? colors.accent : colors.border,
                  backgroundColor: method === m ? "rgba(255,176,32,0.1)" : "transparent",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: method === m ? colors.accent : colors.textMuted, fontSize: 12 }}>{m}</Text>
              </Pressable>
            ))}
          </View>

          {proofUrl ? (
            <Text style={{ color: colors.secondary, marginBottom: 16 }}>Proof uploaded ✓</Text>
          ) : (
            <Pressable onPress={pickProof} style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>📷 Upload payment proof (optional)</Text>
            </Pressable>
          )}

          <Button title="Submit Top-up" onPress={submit} loading={busy} disabled={!amount} />
          <View style={{ marginTop: 10 }}>
            <Button title="Cancel" variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
