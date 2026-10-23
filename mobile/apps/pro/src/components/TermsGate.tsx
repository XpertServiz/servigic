// For a signed-in user who has not e-signed the current agreement of their country (an account made before e-signing existed,
// or a new version): a full-screen window with the agreement until it is accepted. Shared by apps/customer and apps/pro.
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { APP_ROLE } from "../lib/appRole";
import { GradientButton } from "./ds";
import { AcceptAgreement, type TermsAcceptance } from "./AcceptAgreement";

export function TermsGate() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = (user as { id?: string } | null)?.id ?? null;
  const userName = (user as { name?: string } | null)?.name ?? "";
  const [pending, setPending] = useState<api.AgreementDoc | null>(null);
  const [value, setValue] = useState<TermsAcceptance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    api
      .getLegalStatus()
      .then((d) => alive && setPending(d.pending))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  if (!userId || !pending) return null;

  async function accept() {
    if (!value) return setError(t("legal.required"));
    setBusy(true);
    setError(null);
    try {
      await api.acceptTerms(value);
      setPending(null);
    } catch (e) {
      const fresh = e instanceof api.ApiError ? (e.data.agreement as api.AgreementDoc | undefined) : undefined;
      if (fresh) setPending(fresh);
      setError(e instanceof Error ? e.message : t("legal.required"));
    } finally {
      setBusy(false);
    }
  }

  const role: string = APP_ROLE; // widened: this shared file is compiled in both apps, where APP_ROLE is a different literal
  return (
    <Modal visible animationType="slide" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 10 }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "800", marginBottom: 6 }}>{t("legal.gateTitle")}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13.5, lineHeight: 19, marginBottom: 14 }}>{t("legal.gateBody", { country: pending.countryName })}</Text>
          <AcceptAgreement role={role === "PROVIDER" ? "PROVIDER" : "CUSTOMER"} name={userName} onChange={setValue} preloaded={pending} />
          {error && <Text style={{ color: colors.dangerSoft, marginBottom: 10 }}>{error}</Text>}
          <GradientButton title={busy ? "…" : t("legal.acceptButton")} onPress={accept} disabled={!value || busy} />
        </ScrollView>
      </View>
    </Modal>
  );
}
