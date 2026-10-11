// Language picker (redesign spec §6, D3-Language): searchable list grouped into
// "Suggested for your country" and "All languages", each language in its own
// native script. Shared verbatim by apps/customer and apps/pro.
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, SectionList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../lib/theme";
import { LANGUAGES, useI18n, type LangCode } from "../lib/i18n";
import { Icon } from "../components/Icon";
import { haptic } from "../components/ds";

type Lang = (typeof LANGUAGES)[number];

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t, lang, setLanguage, suggestedForCountry, countryName } = useI18n();
  const suggestedLang = LANGUAGES.find((l) => l.code === suggestedForCountry);
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (l: Lang) => !q || l.native.toLowerCase().includes(q) || l.english.toLowerCase().includes(q) || l.code.includes(q);
    // The country's language first, then English as the universal fallback.
    const suggestedCodes = suggestedForCountry ? Array.from(new Set<string>([suggestedForCountry, "en"])) : [];
    const suggested = suggestedCodes
      .map((code) => LANGUAGES.find((l) => l.code === code))
      .filter((l): l is Lang => !!l && matches(l));
    const rest = LANGUAGES.filter((l) => matches(l) && !suggested.some((s) => s.code === l.code));
    return [
      ...(suggested.length ? [{ key: "suggested", title: t("lang.suggested", { country: countryName ?? "" }), data: suggested as Lang[] }] : []),
      ...(rest.length ? [{ key: "all", title: t("lang.all"), data: rest as Lang[] }] : []),
    ];
  }, [query, suggestedForCountry, t]);

  async function choose(code: LangCode) {
    haptic.success();
    await setLanguage(code);
    if (navigation.canGoBack()) navigation.goBack();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <Text style={styles.title}>{t("lang.title")}</Text>
      </View>

      {suggestedLang && suggestedLang.code !== lang && (
        <View style={styles.detected}>
          <View style={styles.detectedBox}>
            <Icon name="pin-home" size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detectedTitle}>{t("lang.detected", { country: countryName ?? "" })}</Text>
              <Text style={styles.detectedBody}>{t("lang.recommend", { language: suggestedLang.native })}</Text>
            </View>
          </View>
          <Pressable onPress={() => choose(suggestedLang.code)} style={styles.useBtn}>
            <Text style={styles.useBtnText}>{t("lang.use", { language: suggestedLang.native })}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.search}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("lang.search")}
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(l) => l.code}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 24 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        renderItem={({ item }) => {
          const active = item.code === lang;
          return (
            <Pressable onPress={() => choose(item.code)} style={[styles.row, active && styles.rowActive]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.native}>{item.native}</Text>
                <Text style={styles.english}>{item.english}</Text>
              </View>
              {active && <Icon name="check" size={18} color={colors.accent} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>{t("lang.noResults")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 12 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  detected: { paddingHorizontal: 18, paddingBottom: 8 },
  detectedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(245,166,35,0.1)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    padding: 13,
  },
  detectedTitle: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  detectedBody: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  useBtn: { marginTop: 10, backgroundColor: colors.accent, borderRadius: 11, paddingVertical: 12, alignItems: "center" },
  useBtnText: { color: colors.accentForeground, fontWeight: "800", fontSize: 14 },
  search: { paddingHorizontal: 18, paddingBottom: 6 },
  searchInput: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.18)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 18, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  rowActive: { borderColor: colors.accentBorder, backgroundColor: "rgba(245,166,35,0.07)" },
  native: { color: colors.text, fontSize: 17, fontWeight: "700" },
  english: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
