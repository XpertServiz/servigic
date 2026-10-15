import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Pressable, Text, TextInput, View, StyleSheet, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/theme";
import { haptic, GradientButton } from "./ds";
import { Icon } from "./Icon";
import { useI18n, useT } from "../lib/i18n";
import { allCountries, countryByCode, defaultCountry, exampleFor, parsePhone, type CountryCode } from "../lib/phone";

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

// Phone input for every auth form: a country picker (flag + dial code) plus the
// number, validated with libphonenumber. The picker defaults from the server geo
// hint, then the device region, then Pakistan - a suggestion the user can always
// change. Validates on blur (never mid-typing), auto-normalises a typed +code or
// 00 prefix, and the example in the placeholder and the error message is
// generated for the selected country. The number is exposed in E.164.
export function usePhoneInput() {
  const { countryCode } = useI18n();
  const [country, setCountryState] = useState<CountryCode>(() => defaultCountry(countryCode));
  const [countryTouched, setCountryTouched] = useState(false);
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);

  // The geo hint arrives asynchronously; apply it unless the user already chose.
  useEffect(() => {
    if (!countryTouched) setCountryState(defaultCountry(countryCode));
  }, [countryCode, countryTouched]);

  const parsed = useMemo(() => parsePhone(text, country), [text, country]);
  const example = useMemo(() => exampleFor(country), [country]);
  return {
    country,
    setCountry: (c: CountryCode) => {
      setCountryTouched(true);
      setCountryState(c);
    },
    text,
    setText,
    touched,
    setTouched,
    e164: parsed.e164,
    valid: parsed.valid,
    parsed,
    example,
  };
}
export type PhoneInputState = ReturnType<typeof usePhoneInput>;

export function PhoneField({ phone, label }: { phone: PhoneInputState; label?: string }) {
  const t = useT();
  const [picking, setPicking] = useState(false);
  const [focused, setFocused] = useState(false);
  const selected = countryByCode(phone.country);
  const invalid = phone.touched && !phone.valid;

  function onBlur() {
    setFocused(false);
    phone.setTouched(true);
    // A number typed with its own country code switches the picker to match.
    const p = phone.parsed;
    if (p.valid && p.detectedCountry && p.detectedCountry !== phone.country) phone.setCountry(p.detectedCountry);
    if (p.valid && p.national) phone.setText(p.national);
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label ?? t("phone.label")}</Text>
      <View style={[styles.inputWrap, focused && { borderColor: colors.accent }, invalid && { borderColor: colors.danger, borderWidth: 1.5 }]}>
        <Pressable onPress={() => setPicking(true)} style={styles.dial} accessibilityLabel={t("phone.country")}>
          <Text style={{ fontSize: 18 }}>{selected?.flag}</Text>
          <Text style={styles.dialText}>{selected?.dial}</Text>
          <Text style={{ color: colors.textFaint, fontSize: 10 }}>▼</Text>
        </Pressable>
        <TextInput
          value={phone.text}
          onChangeText={phone.setText}
          onFocus={() => setFocused(true)}
          onBlur={onBlur}
          placeholder={phone.example.national}
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {invalid && <Icon name="warning" size={17} color={colors.danger} />}
      </View>
      {invalid ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>
            {t("phone.errorPrefix")} {phone.example.international}
          </Text>
        </View>
      ) : (
        <Text style={styles.helper}>{t("phone.hint")}</Text>
      )}
      <CountryPicker
        visible={picking}
        selected={phone.country}
        onClose={() => setPicking(false)}
        onSelect={(c) => {
          phone.setCountry(c);
          setPicking(false);
        }}
      />
    </View>
  );
}

function CountryPicker({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: CountryCode;
  onClose: () => void;
  onSelect: (c: CountryCode) => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    const all = allCountries();
    if (!q) return all;
    return all.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q || c.dial.replace("+", "").startsWith(q));
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }} behavior="padding">
        <View style={[styles.pickerSheet, { paddingBottom: 18 + insets.bottom }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "800" }}>{t("phone.country")}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("phone.searchCountry")}
            placeholderTextColor={colors.textFaint}
            style={styles.pickerSearch}
            autoCorrect={false}
          />
          <FlatList
            data={list}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            renderItem={({ item }) => (
              <Pressable onPress={() => onSelect(item.code)} style={[styles.countryRow, item.code === selected && { backgroundColor: colors.accentTint }]}>
                <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                <Text style={{ flex: 1, color: colors.text, fontSize: 14 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{item.dial}</Text>
              </Pressable>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  dial: { flexDirection: "row", alignItems: "center", gap: 5, paddingRight: 10, marginRight: 2, borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.1)", paddingVertical: 13 },
  dialText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  pickerSheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: "80%" },
  pickerSearch: { backgroundColor: colors.bg, borderWidth: 1, borderColor: "rgba(245,166,35,0.18)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, marginBottom: 8 },
  countryRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
});
