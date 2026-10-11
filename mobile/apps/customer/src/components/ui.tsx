import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet, type TextInputProps } from "react-native";
import { colors } from "../lib/theme";
import { haptic, GradientButton } from "./ds";
import { Icon } from "./Icon";
import { useT } from "../lib/i18n";
import { PHONE_EXAMPLE, isValidPhone, normalizePhone } from "../lib/phone";

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
  variant?: "primary" | "ghost" | "danger" | "secondary";
  disabled?: boolean;
}) {
  if (variant === "primary") {
    return (
      <GradientButton onPress={onPress} disabled={disabled || loading}>
        {loading ? <ActivityIndicator color={colors.accentForeground} /> : <Text style={styles.primaryText}>{title}</Text>}
      </GradientButton>
    );
  }

  const bg = variant === "danger" ? colors.dangerTint : variant === "secondary" ? colors.secondary : "transparent";
  const textColor = variant === "secondary" ? colors.secondaryForeground : variant === "danger" ? colors.dangerSoft : colors.accent;
  return (
    <Pressable
      onPress={() => {
        if (!disabled && !loading) {
          haptic.light();
          onPress();
        }
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: pressed || disabled || loading ? 0.65 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
        variant === "danger" && { borderWidth: 1, borderColor: "rgba(220,60,60,0.3)" },
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={{ color: textColor, fontWeight: "700", fontSize: 15 }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  helper,
  ...props
}: { label: string; error?: string | null; helper?: React.ReactNode } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: colors.accent },
          !!error && { borderColor: colors.danger, borderWidth: 1.5 },
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textFaint}
          style={[styles.input, props.multiline && { minHeight: 88, textAlignVertical: "top" }]}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {!!error && <Icon name="warning" size={17} color={colors.danger} />}
      </View>
      {!!error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!error && !!helper && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
}

// Phone input for every auth form. Local Pakistani format only
// (03XXXXXXXXX); a leading +92 / 0092 is converted automatically. Validates
// on blur, never mid-typing, so it doesn't flash red while the user types.
export function PhoneField({
  value,
  onChangeText,
  label,
  onValidityChange,
}: {
  value: string;
  onChangeText: (v: string) => void;
  label?: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const t = useT();
  const [touched, setTouched] = useState(false);
  const invalid = touched && !isValidPhone(value);

  return (
    <Field
      label={label ?? t("phone.label")}
      keyboardType="phone-pad"
      placeholder={PHONE_EXAMPLE}
      value={value}
      onChangeText={(v) => {
        onChangeText(v);
        onValidityChange?.(isValidPhone(v));
      }}
      onBlur={() => {
        const normalized = normalizePhone(value);
        if (normalized !== value) onChangeText(normalized);
        setTouched(true);
        onValidityChange?.(isValidPhone(normalized));
      }}
      error={invalid ? `${t("phone.errorPrefix")} ${PHONE_EXAMPLE}` : null}
      helper={t("phone.hint")}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone = "muted" }: { label: string; tone?: "accent" | "secondary" | "danger" | "muted" }) {
  const color = { accent: colors.accent, secondary: colors.secondary, danger: colors.dangerSoft, muted: colors.textMuted }[tone];
  const bg = { accent: colors.accentTint, secondary: "rgba(30,194,139,0.14)", danger: colors.dangerTint, muted: "rgba(255,255,255,0.05)" }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color, fontSize: 10, fontWeight: "700", letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.accentForeground, fontWeight: "800", fontSize: 16 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.18)",
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  input: { flex: 1, paddingVertical: 13, color: colors.text, fontSize: 15 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  errorText: { color: colors.dangerSoft, fontSize: 11.5 },
  helper: { color: colors.textFainter, fontSize: 11, marginTop: 5 },
  card: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: 16,
  },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
});
