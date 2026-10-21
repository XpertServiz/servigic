// The Servigic assistant: a friendly face with a waving hand in the corner of the screen. Tapping it opens a chat that answers
// from the app's own FAQ / how-it-works / trust texts right on the phone; only a question those texts cannot answer is sent to the
// server, which remembers every answer so the same question is never paid for twice. It opens in the language of the user's
// country (Arabic in Saudi Arabia, Urdu in Pakistan, ...) with English one tap away.
// Shared verbatim by apps/customer and apps/pro.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { FACE_XML, HAND_XML } from "../lib/chatAvatar";
import { MIN_SCORE, normalize, rank } from "../lib/chatMatch";
import { loadMarketConfig } from "../lib/market";

const LANG_NAMES: Record<string, string> = { en: "English", ur: "اردو", ar: "العربية", de: "Deutsch", fr: "Français", es: "Español", hi: "हिन्दी", pl: "Polski" };
const RTL = new Set(["ar", "ur"]);
const KEY_LANG = "servigic_chat_lang";

interface Msg {
  from: "me" | "bot";
  text: string;
  support?: boolean;
}

function Avatar({ size, wave }: { size: number; wave: boolean }) {
  const swing = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!wave) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(swing, { toValue: -1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(swing, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(swing, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [wave, swing]);
  const handH = size * 0.43;
  const rotate = swing.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-14deg", "4deg", "20deg"] });
  return (
    <View style={{ width: size, height: size }}>
      <SvgXml xml={FACE_XML} width={size} height={size} />
      <Animated.View style={{ position: "absolute", right: size * 0.02, top: size * 0.44, width: size * 0.3, height: handH, transform: [{ translateY: handH / 2 }, { rotate }, { translateY: -handH / 2 }] }}>
        <SvgXml xml={HAND_XML} width="100%" height="100%" />
      </Animated.View>
    </View>
  );
}

export function ChatAssistant() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("PK");
  const [defaultLang, setDefaultLang] = useState("en");
  const [lang, setLang] = useState("en");
  const [kb, setKb] = useState<api.ChatKb | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [support, setSupport] = useState<string | null>(null);
  const memo = useRef(new Map<string, string>()).current;
  const scroller = useRef<ScrollView>(null);
  const langs = useMemo(() => Array.from(new Set([defaultLang, "en"])), [defaultLang]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await api.getMarket();
        const dl = m.chatLanguage && LANG_NAMES[m.chatLanguage] ? m.chatLanguage : "en";
        if (!alive) return;
        setCountry(m.country);
        setDefaultLang(dl);
        const saved = await SecureStore.getItemAsync(KEY_LANG).catch(() => null);
        setLang(saved && (saved === "en" || saved === dl) ? saved : dl);
      } catch {
        // offline: stay on English
      }
      const cfg = await loadMarketConfig(null).catch(() => null);
      if (alive && cfg?.app?.supportWhatsapp) setSupport(cfg.app.supportWhatsapp);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadKb = useCallback(
    async (l: string) => {
      try {
        const k = await api.getChatKb(l, country);
        setKb(k);
        return k;
      } catch {
        return null;
      }
    },
    [country],
  );

  useEffect(() => {
    if (open && (!kb || kb.lang !== lang)) loadKb(lang);
  }, [open, lang, kb, loadKb]);

  const ui = kb?.ui ?? {};
  const rtl = RTL.has(lang);
  const textDir = { writingDirection: rtl ? ("rtl" as const) : ("ltr" as const), textAlign: rtl ? ("right" as const) : ("left" as const) };

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setInput("");
    const k = kb ?? (await loadKb(lang));
    const best = k ? rank(q, k.entries, 1)[0] : undefined;
    if (best && best.score >= MIN_SCORE) {
      setMsgs((m) => [...m, { from: "bot", text: best.entry.a }]);
      return;
    }
    const key = `${lang}|${normalize(q)}`;
    const seen = memo.get(key);
    if (seen) {
      setMsgs((m) => [...m, { from: "bot", text: seen }]);
      return;
    }
    setBusy(true);
    try {
      const res = await api.askChat(lang, country, q);
      if (res.answer) {
        memo.set(key, res.answer);
        setMsgs((m) => [...m, { from: "bot", text: res.answer as string }]);
      } else {
        setMsgs((m) => [...m, { from: "bot", text: ui.notFound ?? t("assistant.notFound"), support: true }]);
      }
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: ui.notFound ?? t("assistant.notFound"), support: true }]);
    } finally {
      setBusy(false);
    }
  }

  function pick(l: string) {
    setLang(l);
    setMsgs([]);
    SecureStore.setItemAsync(KEY_LANG, l).catch(() => {});
  }

  return (
    <>
      {!open && (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t("assistant.title")} style={[styles.fab, { bottom: insets.bottom + 84 }]}>
          <Avatar size={64} wave />
        </Pressable>
      )}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView behavior="padding">
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
              <View style={styles.header}>
                <Avatar size={44} wave={false} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{ui.title ?? t("assistant.title")}</Text>
                  {langs.length > 1 && (
                    <View style={styles.langRow}>
                      {langs.map((l) => (
                        <Pressable key={l} onPress={() => pick(l)} style={[styles.pill, lang === l && styles.pillOn]}>
                          <Text style={[styles.pillText, lang === l && { color: colors.accent }]}>{LANG_NAMES[l] ?? l}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
                <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel={ui.close ?? t("assistant.close")}>
                  <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
                </Pressable>
              </View>

              <ScrollView ref={scroller} style={styles.body} contentContainerStyle={{ padding: 14, gap: 10 }} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
                <View style={[styles.bubble, styles.botBubble]}>
                  <Text style={[styles.botText, textDir]}>{ui.hello ?? t("assistant.hello")}</Text>
                </View>
                {msgs.length === 0 && kb && kb.suggested.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={[styles.hint, textDir]}>{ui.popular ?? t("assistant.popular")}</Text>
                    {kb.suggested.map((id) => {
                      const e = kb.entries.find((x) => x.id === id);
                      return e ? (
                        <Pressable key={id} onPress={() => ask(e.q)} style={styles.chip}>
                          <Text style={[styles.chipText, textDir]}>{e.q}</Text>
                        </Pressable>
                      ) : null;
                    })}
                  </View>
                )}
                {msgs.map((m, i) => (
                  <View key={i} style={[styles.bubble, m.from === "me" ? styles.myBubble : styles.botBubble]}>
                    <Text style={[m.from === "me" ? styles.myText : styles.botText, textDir]}>{m.text}</Text>
                    {m.support && support && (
                      <Pressable onPress={() => Linking.openURL(`https://wa.me/${support.replace(/[^\d]/g, "")}`)} style={styles.wa}>
                        <Text style={styles.waText}>{ui.whatsapp ?? t("assistant.whatsapp")}</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
                {busy && (
                  <View style={[styles.bubble, styles.botBubble, { flexDirection: "row", gap: 8, alignItems: "center" }]}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.botText}>{ui.typing ?? t("assistant.typing")}</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.inputRow}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => ask(input)}
                  returnKeyType="send"
                  maxLength={300}
                  placeholder={ui.placeholder ?? t("assistant.placeholder")}
                  placeholderTextColor={colors.textFaint}
                  style={[styles.input, textDir]}
                />
                <Pressable onPress={() => ask(input)} disabled={busy || !input.trim()} style={[styles.send, (busy || !input.trim()) && { opacity: 0.5 }]}>
                  <Text style={styles.sendText}>{ui.send ?? t("assistant.send")}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: { position: "absolute", right: 14, zIndex: 50, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 26, borderTopRightRadius: 26, height: 560, maxHeight: "86%", overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontWeight: "800", fontSize: 15 },
  langRow: { flexDirection: "row", gap: 6, marginTop: 5 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillOn: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  pillText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  body: { flex: 1 },
  bubble: { maxWidth: "88%", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  botBubble: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.07)" },
  myBubble: { alignSelf: "flex-end", backgroundColor: colors.accent },
  botText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  myText: { color: colors.accentForeground, fontSize: 14, lineHeight: 21 },
  hint: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  wa: { marginTop: 8, backgroundColor: colors.secondary, borderRadius: 999, paddingVertical: 7, alignItems: "center" },
  waText: { color: colors.secondaryForeground, fontWeight: "700", fontSize: 12 },
  inputRow: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, color: colors.text, fontSize: 14 },
  send: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 16, justifyContent: "center" },
  sendText: { color: colors.accentForeground, fontWeight: "800", fontSize: 13 },
});
