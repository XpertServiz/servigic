import React, { useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "../lib/api";
import { Button, Field } from "../components/ui";
import { colors, radius } from "../lib/theme";
import { useT } from "../lib/i18n";
import * as Location from "expo-location";

// `code` is stored by the backend; `key` is the localized label.
const REASONS = [
  { code: "PROVIDER_UNAVAILABLE", key: "cancel.unavailable" },
  { code: "PROVIDER_JOB_TOO_FAR", key: "cancel.tooFar" },
  { code: "PROVIDER_PRICE_DISPUTE", key: "cancel.priceDispute" },
  { code: "PROVIDER_CUSTOMER_NOT_AVAILABLE", key: "cancel.customerAway" },
  { code: "OTHER", key: "cancel.other" },
] as const;

// Anti-Disintermediation System — cancellation friction (v7 §2.3).
export function CancelBookingSheet({
  visible,
  bookingId,
  arrived = false,
  onClose,
  onCancelled,
}: {
  visible: boolean;
  bookingId: string;
  /** The pro is at the address: "customer not available" is offered, and his position is sent as proof. */
  arrived?: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const [reasonCode, setReasonCode] = useState<(typeof REASONS)[number]["code"] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reasonCode) return;
    setBusy(true);
    try {
      let position: { lat: number; lng: number } | undefined;
      if (reasonCode === "PROVIDER_CUSTOMER_NOT_AVAILABLE") {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
          // The fee still applies; the time is recorded without a position.
        }
      }
      await api.cancelBooking(bookingId, reasonCode, note.trim() || undefined, position);
      setReasonCode(null);
      setNote("");
      onCancelled();
      onClose();
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
          <Text style={{ color: colors.dangerSoft, fontSize: 18, fontWeight: "800", marginBottom: 4 }}>{t("cancel.title")}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>{t("cancel.proWarning")}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {REASONS.filter((r) => arrived || r.code !== "PROVIDER_CUSTOMER_NOT_AVAILABLE").map((r) => (
              <Pressable
                key={r.code}
                onPress={() => setReasonCode(r.code)}
                style={{
                  borderWidth: 1,
                  borderColor: reasonCode === r.code ? colors.danger : "rgba(255,255,255,0.1)",
                  backgroundColor: reasonCode === r.code ? colors.dangerTint : "transparent",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: reasonCode === r.code ? colors.dangerSoft : colors.textMuted, fontSize: 12 }}>{t(r.key)}</Text>
              </Pressable>
            ))}
          </View>

          <Field label={t("cancel.note")} multiline numberOfLines={3} value={note} onChangeText={setNote} />

          <Button title={t("cancel.confirm")} variant="danger" onPress={submit} loading={busy} disabled={!reasonCode} />
          <View style={{ marginTop: 10 }}>
            <Button title={t("cancel.neverMind")} variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
