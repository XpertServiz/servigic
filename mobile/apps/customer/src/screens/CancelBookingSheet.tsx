import React, { useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import * as api from "../lib/api";
import { Button, Field } from "../components/ui";
import { colors, radius } from "../lib/theme";

const REASONS = [
  { code: "CUSTOMER_CHANGED_MIND", label: "Changed my mind" },
  { code: "CUSTOMER_FOUND_ANOTHER_PRO", label: "Found another pro" },
  { code: "CUSTOMER_PRICE_TOO_HIGH", label: "Price too high" },
  { code: "CUSTOMER_PRO_ASKED_TO_CANCEL", label: "The pro asked me to cancel" },
  { code: "OTHER", label: "Other" },
] as const;

// Anti-Disintermediation System — cancellation friction (v7 §2.3).
export function CancelBookingSheet({
  visible,
  bookingId,
  onClose,
  onCancelled,
}: {
  visible: boolean;
  bookingId: string;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reasonCode, setReasonCode] = useState<(typeof REASONS)[number]["code"] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reasonCode) return;
    setBusy(true);
    try {
      await api.cancelBooking(bookingId, reasonCode, note.trim() || undefined);
      setReasonCode(null);
      setNote("");
      onCancelled();
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
          <Text style={{ color: colors.danger, fontSize: 18, fontWeight: "800", marginBottom: 4 }}>Cancel this booking?</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
            Repeated cancellations affect your posting privileges — this counts against your 30-day cancellation rate.
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {REASONS.map((r) => (
              <Pressable
                key={r.code}
                onPress={() => setReasonCode(r.code)}
                style={{
                  borderWidth: 1,
                  borderColor: reasonCode === r.code ? colors.danger : colors.border,
                  backgroundColor: reasonCode === r.code ? "rgba(239,68,68,0.15)" : "transparent",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: reasonCode === r.code ? colors.danger : colors.textMuted, fontSize: 12 }}>{r.label}</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Anything else? (optional)" multiline numberOfLines={3} value={note} onChangeText={setNote} />

          <Button title="Confirm cancellation" variant="danger" onPress={submit} loading={busy} disabled={!reasonCode} />
          <View style={{ marginTop: 10 }}>
            <Button title="Never mind" variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
