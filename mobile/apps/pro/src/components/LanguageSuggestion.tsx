// First-launch language *suggestion* (never a silent switch): shown once, in
// the suggested language itself, with an easy way to keep the current one.
// Shared verbatim by apps/customer and apps/pro.
import React from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { LANGUAGES, translateIn, useI18n } from "../lib/i18n";
import { colors } from "../lib/theme";
import { Button } from "./ui";

export function LanguageSuggestion() {
  const { suggestion, lang, setLanguage, dismissSuggestion } = useI18n();
  if (!suggestion) return null;
  const target = LANGUAGES.find((l) => l.code === suggestion);
  const current = LANGUAGES.find((l) => l.code === lang);
  if (!target) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismissSuggestion}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{translateIn(suggestion, "lang.suggestTitle", { language: target.native })}</Text>
          <Text style={styles.body}>{translateIn(suggestion, "lang.suggestBody")}</Text>
          <View style={{ gap: 10, marginTop: 18 }}>
            <Button title={translateIn(suggestion, "lang.suggestUse", { language: target.native })} onPress={() => setLanguage(suggestion)} />
            <Button
              title={translateIn(lang, "lang.suggestKeep", { language: current?.native ?? "" })}
              variant="ghost"
              onPress={dismissSuggestion}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: 22,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: "800", textAlign: "center" },
  body: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 19 },
});
