// Globe (language) + bell (notifications) buttons shown top-right on every
// primary screen (redesign spec §6). Shared verbatim by apps/customer and
// apps/pro.
import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { navigateRoot } from "../navigation/ref";
import { Icon } from "./Icon";
import { haptic } from "./ds";
import { useT } from "../lib/i18n";

const UNREAD_POLL_MS = 60000;

export function HeaderActions({ showBell = true }: { showBell?: boolean }) {
  const t = useT();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user || !showBell) return;
    let cancelled = false;
    const load = () =>
      api
        .getNotifications()
        .then((r) => !cancelled && setUnread(r.unreadCount))
        .catch(() => {});
    load();
    const id = setInterval(load, UNREAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user, showBell]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={t("lang.title")}
        onPress={() => {
          haptic.light();
          navigateRoot("Language");
        }}
        style={styles.btn}
      >
        <Icon name="globe" size={17} />
      </Pressable>
      {showBell && (
        <Pressable
          accessibilityLabel={t("notifications.title")}
          onPress={() => {
            haptic.light();
            navigateRoot("Notifications");
          }}
          style={styles.btn}
        >
          <Icon name="bell" size={16} />
          {unread > 0 && <View style={styles.dot} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
