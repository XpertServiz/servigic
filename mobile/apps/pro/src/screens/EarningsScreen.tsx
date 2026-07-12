import React, { useCallback, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as api from "../lib/api";
import { Card, Badge } from "../components/ui";
import { colors } from "../lib/theme";

type Earnings = Awaited<ReturnType<typeof api.getProviderEarnings>>;

export default function EarningsScreen() {
  const [data, setData] = useState<Earnings | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.getProviderEarnings().then(setData);
    }, [])
  );

  if (!data) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.accent, fontSize: 20, fontWeight: "800" }}>PKR {data.totalSent.toLocaleString()}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12 }}>Total earned</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.accent, fontSize: 20, fontWeight: "800" }}>PKR {data.totalQueued.toLocaleString()}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12 }}>Queued</Text>
        </Card>
      </View>

      <FlatList
        data={data.payouts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 10 }}
        ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>No payouts yet.</Text>}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {item.categoryIcon} {item.jobTitle}
              </Text>
              <Badge label={item.status} tone={item.status === "QUEUED" ? "accent" : "secondary"} />
            </View>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>PKR {item.amountPKR.toLocaleString()}</Text>
          </Card>
        )}
      />
    </View>
  );
}
