import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as api from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button, Field, Card } from "../components/ui";
import { colors } from "../lib/theme";

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
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [trades, setTrades] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState("10");
  const [coords, setCoords] = useState({ lat: 24.8607, lng: 67.0011 });
  const [cnicUrl, setCnicUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState(0);

  useEffect(() => {
    api.getProviderProfile().then(({ profile }) => {
      if (!profile) return;
      const p = profile as Record<string, unknown>;
      setDisplayName((p.displayName as string) ?? "");
      setTrades((p.trades as string[]) ?? []);
      setRadiusKm(String(p.serviceRadiusKm ?? 10));
      if (p.baseLat && p.baseLng) setCoords({ lat: p.baseLat as number, lng: p.baseLng as number });
      setCnicUrl((p.cnicUrl as string) ?? "");
      setSelfieUrl((p.selfieUrl as string) ?? "");
      setPayoutAccount((p.payoutAccount as string) ?? "");
      setVerificationLevel((p.verificationLevel as number) ?? 0);
    });
  }, []);

  function toggleTrade(t: string) {
    setTrades((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  async function pickDoc(setUrl: (url: string) => void) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const url = await api.uploadFile(asset.uri, asset.fileName ?? "doc.jpg", asset.mimeType ?? "image/jpeg");
    setUrl(url);
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateProviderProfile({
        displayName,
        trades,
        serviceRadiusKm: Number(radiusKm),
        baseLat: coords.lat,
        baseLng: coords.lng,
        cnicUrl: cnicUrl || undefined,
        selfieUrl: selfieUrl || undefined,
        payoutMethod: "EASYPAISA",
        payoutAccount,
        agreementAccepted: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.text, fontWeight: "700" }}>{user?.name}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 2 }}>{user?.phone}</Text>
        <Text style={{ color: colors.accent, marginTop: 6, fontSize: 12 }}>Verification level: {verificationLevel}</Text>
      </Card>

      <Field label="Display name" value={displayName} onChangeText={setDisplayName} />

      <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>Trades</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {TRADES.map((t) => (
          <Pressable
            key={t}
            onPress={() => toggleTrade(t)}
            style={{
              borderWidth: 1,
              borderColor: trades.includes(t) ? colors.accent : colors.border,
              backgroundColor: trades.includes(t) ? "rgba(255,176,32,0.1)" : "transparent",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: trades.includes(t) ? colors.accent : colors.textMuted, fontSize: 12 }}>{t.replace("_", " ")}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Service radius (km)" keyboardType="number-pad" value={radiusKm} onChangeText={setRadiusKm} />

      <Pressable onPress={useMyLocation} style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.accent, fontWeight: "700" }}>📍 Use my current location</Text>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
        <Pressable onPress={() => pickDoc(setCnicUrl)}>
          <Text style={{ color: cnicUrl ? colors.secondary : colors.accent, fontWeight: "700" }}>{cnicUrl ? "CNIC ✓" : "Upload CNIC"}</Text>
        </Pressable>
        <Pressable onPress={() => pickDoc(setSelfieUrl)}>
          <Text style={{ color: selfieUrl ? colors.secondary : colors.accent, fontWeight: "700" }}>
            {selfieUrl ? "Selfie ✓" : "Upload Selfie"}
          </Text>
        </Pressable>
      </View>

      <Field label="EasyPaisa/JazzCash account number" value={payoutAccount} onChangeText={setPayoutAccount} />

      <View style={{ marginTop: 8, marginBottom: 24 }}>
        <Button title="Save Profile" onPress={save} loading={saving} />
      </View>

      <Button title="Log out" variant="danger" onPress={signOut} />
    </ScrollView>
  );
}
