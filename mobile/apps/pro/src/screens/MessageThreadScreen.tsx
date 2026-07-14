import React, { useCallback, useRef, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { haptic } from "../components/ds";

type Props = NativeStackScreenProps<JobsStackParamList, "MessageThread">;
type Message = Awaited<ReturnType<typeof api.getMessages>>["messages"][number];

const POLL_MS = 8000;

export default function MessageThreadScreen({ route }: Props) {
  const { bookingId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(() => {
    api.getMessages(bookingId).then(({ messages: m }) => setMessages(m));
    api.getBookingDetail(bookingId).then(({ booking }) => setLocked(booking.status === "COMPLETED"));
  }, [bookingId]);

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          return (
            <View style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={{ color: mine ? colors.accentForeground : colors.text }}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />
      {locked ? (
        <View style={styles.lockedBar}>
          <Text style={styles.lockedText}>🔒 This job is complete — chat is closed.</Text>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Message…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
          />
          <Pressable onPress={send} disabled={sending || !body.trim()} style={styles.sendBtn}>
            <Text style={{ color: colors.accentForeground, fontWeight: "800" }}>→</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.secondary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bgElevated, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBar: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
  },
  lockedText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
