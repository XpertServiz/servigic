import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../lib/auth";
import { LoginScreen } from "../screens/LoginScreen";
import { AdminWebScreen } from "../screens/AdminWebScreen";
import { colors } from "../lib/theme";

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <NavigationContainer>{user ? <AdminWebScreen /> : <LoginScreen />}</NavigationContainer>;
}
