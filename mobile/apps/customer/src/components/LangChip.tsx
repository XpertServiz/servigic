// "اردو | English" with a globe: the country's own language and English, one tap each. Sits top-right on sign-in / sign-up.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { colors } from "../lib/theme";
import { LANGUAGES, useI18n } from "../lib/i18n";
import { chipLanguages } from "../lib/authHero";

export function LangChip({ country }: { country: string }) {
  const { lang, setLanguage } = useI18n();
  const codes = chipLanguages(country);
  return (
    <View style={styles.row}>
      <Icon name="globe" size={20} color={colors.text} />
      {codes.map((code, i) => (
        <React.Fragment key={code}>
          {i > 0 && <Text style={styles.sep}>|</Text>}
          <Pressable onPress={() => code !== lang && setLanguage(code)} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.text, code === lang && styles.on]}>{LANGUAGES.find((l) => l.code === code)?.native}</Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  sep: { color: colors.accent, fontSize: 15 },
  text: { color: colors.accent, fontSize: 15, fontWeight: "600", opacity: 0.75 },
  on: { opacity: 1, fontWeight: "800" },
});
