// Notifications list behind the bell icon. Not part of the design round, so it
// reuses the redesign tokens and the same card pattern as the rest of the app.
// Shared verbatim by apps/customer and apps/pro.
import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { Icon } from "../components/Icon";
import { EmptyState } from "../components/ds";
import { navigateRoot } from "../navigation/ref";

type Item = Awaited<ReturnType<typeof api.getNotifications>>["notifications"][number];

function timeAgo(iso: string, t: ReturnType<typeof useT>): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return t("time.justNow");
  if (mins < 60) return t("time.minutesAgo", { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return t("time.hoursAgo", { n: hrs });
  return t("time.daysAgo", { n: Math.round(hrs / 24) });
}

// linkUrl values are web paths (/pro/jobs/<id>, /bookings/<id>); map the ones
// the app has a screen for and ignore the rest.
function openLink(linkUrl: string | null) {
  if (!linkUrl) return;
  const job = linkUrl.match(/\/jobs\/([^/?#]+)/);
  const booking = linkUrl.match(/\/bookings\/([^/?#]+)/);
  if (booking) navigateRoot("Main", { screen: "JobsTab", params: { screen: "BookingDetail", params: { bookingId: booking[1] } } });
  else if (job) navigateRoot("Main", { screen: "JobsTab", params: { screen: "JobDetail", params: { jobId: job[1] } } });
}

export default function NotificationsScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { notifications } = await api.getNotifications();
      setItems(notifications);
      api.markNotificationsRead().catch(() => {});
    } catch {
      // Older backend without the endpoint: just show the empty state.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <Text style={styles.title}>{t("notifications.title")}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 24, gap: 10 }}
        ListEmptyComponent={<EmptyState icon="🔔" title={t("notifications.empty")} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => openLink(item.linkUrl)} style={[styles.card, !item.isRead && styles.unread]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody} numberOfLines={3}>
                {item.body}
              </Text>
            </View>
            <Text style={styles.time}>{timeAgo(item.createdAt, t)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 12 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  card: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    padding: 14,
  },
  unread: { borderColor: colors.accentBorder, backgroundColor: "rgba(245,166,35,0.05)" },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  cardBody: { color: colors.textMuted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  time: { color: colors.textFaint, fontSize: 10 },
});
