import React from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet, type TextInputProps } from "react-native";
import { colors } from "../lib/theme";

export function Button({
  title,
  onPress,
  loading,
  variant = "primary",
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const bg = variant === "primary" ? colors.accent : variant === "danger" ? colors.danger : "transparent";
  const textColor = variant === "primary" ? colors.accentForeground : variant === "danger" ? "#fff" : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: pressed || disabled || loading ? 0.7 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={{ color: textColor, fontWeight: "700" }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...props} />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone = "muted" }: { label: string; tone?: "accent" | "secondary" | "danger" | "muted" }) {
  const color = { accent: colors.accent, secondary: colors.secondary, danger: colors.danger, muted: colors.textMuted }[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated, borderRadius: 14, padding: 16 },
  badge: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
});
