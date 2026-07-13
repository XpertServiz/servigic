import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brand}>Servigic</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 18 },
  logo: { width: 96, height: 96 },
  brand: { color: colors.accent, fontSize: 34, fontWeight: "900", letterSpacing: 1 },
});
