import React from "react";
import { View, Text } from "react-native";
import { useAuth } from "../lib/auth";
import { Button, Card } from "../components/ui";
import { colors } from "../lib/theme";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Card>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>{user?.name}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4 }}>{user?.phone}</Text>
      </Card>
      <View style={{ marginTop: 20 }}>
        <Button title="Log out" variant="danger" onPress={signOut} />
      </View>
    </View>
  );
}
