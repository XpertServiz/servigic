// 1:1 chat with the other party on a booking (D3C-Messages). Shared verbatim by
// apps/customer and apps/pro.
import React, { useCallback, useRef, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { haptic, ProviderAvatar } from "../components/ds";
import { Icon } from "../components/Icon";
import { sound } from "../lib/sound";
import { useT } from "../lib/i18n";

type Params = { MessageThread: { bookingId: string; otherPartyName: string } };
type Props = NativeStackScreenProps<Params, "MessageThread">;
type Message = Awaited<ReturnType<typeof api.getMessages>>["messages"][number];

const POLL_MS = 8000;

export default function MessageThreadScreen({ route, navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { bookingId, otherPartyName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState(false);
  const listRef = useRef<FlatList>(null);
  const seenCount = useRef<number | null>(null);

  const load = useCallback(() => {
    api
      .getMessages(bookingId)
      .then(({ messages: m }) => {
        // Soft ping for a message from the other side that arrived while this
        // screen is open (the first load never pings).
        if (seenCount.current !== null && m.length > seenCount.current && m[m.length - 1]?.senderId !== user?.id) sound.messageReceived();
        seenCount.current = m.length;
        setMessages(m);
      })
      .catch(() => {});
    api
      .getBookingDetail(bookingId)
      .then(({ booking }) => {
        setSubtitle(`${booking.categoryIcon as string} ${booking.jobTitle as string}`);
        // Chat opens as soon as it's MASKED (v7 §2.2) — messages are already
        // redacted server-side at that stage, so no client-side masking is
        // needed here. COMPLETED still closes the thread regardless of reveal
        // stage — the relationship is over once the customer confirms done.
        setLocked(booking.revealStage === "LOCKED" || booking.status === "COMPLETED");
      })
      .catch(() => {});
  }, [bookingId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, POLL_MS);
      return () => clearInterval(interval);
    }, [load])
  );

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    haptic.light();
    try {
      await api.sendMessage(bookingId, body.trim());
      setBody("");
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <ProviderAvatar name={otherPartyName} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {otherPartyName}
          </Text>
          {!!subtitle && (
            <Text style={styles.sub} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          return (
            <View style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={{ color: mine ? colors.accentForeground : colors.text, fontSize: 14, fontWeight: mine ? "600" : "400" }}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />
      {locked ? (
        <View style={[styles.lockedBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.lockedText}>🔒 {t("chat.closed")}</Text>
        </View>
      ) : (
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t("chat.placeholder")}
            placeholderTextColor={colors.textFainter}
            style={styles.input}
            multiline
          />
          <Pressable onPress={send} disabled={sending || !body.trim()} style={[styles.sendBtn, (sending || !body.trim()) && { opacity: 0.5 }]} accessibilityLabel={t("chat.send")}>
            <Icon name="send" size={18} color={colors.accentForeground} />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "76%", paddingHorizontal: 14, paddingVertical: 11 },
  bubbleMine: { backgroundColor: colors.accent, borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bgElevated2, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 16, borderBottomLeftRadius: 4 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.bgElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 11,
    maxHeight: 110,
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  lockedBar: { paddingTop: 16, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.bgElevated, alignItems: "center" },
  lockedText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
