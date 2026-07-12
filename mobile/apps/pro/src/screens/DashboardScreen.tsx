import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

interface ProviderProfile {
  displayName: string;
  isOnline: boolean;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  verificationLevel: number;
}

export default function DashboardScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const load = useCallback(() => {
    api.getMe().then(({ user }) => setProfile(user.providerProfile as unknown as ProviderProfile));
  }, []);

  useFocusEffect(load);

  async function toggleOnline() {
    if (!profile) return;
    setTogglingOnline(true);
    try {
      const { isOnline } = await api.setOnline(!profile.isOnline);
      setProfile({ ...profile, isOnline });
    } finally {
      setTogglingOnline(false);
    }
  }

  if (!profile) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>{profile.displayName}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 2 }}>
              {profile.ratingCount > 0 ? `${profile.ratingAvg.toFixed(1)}★` : "New"} · {profile.jobsCompleted} jobs · Level {profile.verificationLevel}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Switch
              value={profile.isOnline}
              onValueChange={toggleOnline}
              disabled={togglingOnline}
              trackColor={{ true: colors.secondary, false: colors.border }}
            />
            <Text style={{ color: profile.isOnline ? colors.secondary : colors.textMuted, fontSize: 11, marginTop: 4 }}>
              {profile.isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
      </Card>

      {profile.verificationLevel < 1 && (
        <Card style={{ marginTop: 12, borderColor: colors.accent }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>Complete verification to start bidding</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>Upload your CNIC and selfie from the web app to get approved.</Text>
        </Card>
      )}

      <View style={{ marginTop: 20, gap: 12 }}>
        <Button title="Job Feed →" onPress={() => navigation.navigate("JobFeed")} />
        <Button title="Bookings" variant="ghost" onPress={() => navigation.navigate("Bookings")} />
        <Button title="Earnings" variant="ghost" onPress={() => navigation.navigate("Earnings")} />
        <Button title="Profile" variant="ghost" onPress={() => navigation.navigate("Profile")} />
      </View>
    </ScrollView>
  );
}
