import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { AnimatedTradeIcon, Chip, GlowBackground, haptic } from "../components/ds";
import { HeaderActions } from "../components/HeaderActions";
import { NativeAdStrip, RewardedDiscountCard, type AdDiscountState } from "../components/AdSlots";
import { WaitlistCard } from "../components/MarketNotice";
import { useMarketConfig } from "../lib/market";
import { colors, accentGradientStops } from "../lib/theme";
import { enumLabel } from "../lib/status";
import { useI18n } from "../lib/i18n";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;
type Category = Awaited<ReturnType<typeof api.getCategories>>["categories"][number];
type Booking = Awaited<ReturnType<typeof api.getMyBookings>>["bookings"][number];

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"];

export default function HomeScreen({ navigation }: Props) {
  const { t, td } = useI18n();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [acceptingJobs, setAcceptingJobs] = useState(true);
  const [comingSoon, setComingSoon] = useState<Category | null>(null);
  const market = useMarketConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [discount, setDiscount] = useState<AdDiscountState | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getCategories()
      .then(({ categories: fetched, acceptingJobs: accepting }) => {
        setCategories(fetched);
        setAcceptingJobs(accepting !== false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("home.loadFailed")))
      .finally(() => setLoading(false));
    api
      .getMyBookings()
      .then(({ bookings }) => setActiveBooking(bookings.find((b) => ACTIVE_BOOKING_STATUSES.includes(b.status)) ?? null))
      .catch(() => setActiveBooking(null));
    // Older backend without the rewards endpoint: the card simply stays hidden.
    api
      .getAdDiscountState()
      .then(setDiscount)
      .catch(() => setDiscount(null));
  }, [t]);

  useFocusEffect(load);

  // Market config (handoff section 11.6): outside a launch area there is nothing to post, only a waitlist.
  const outsideArea = !acceptingJobs || market.outsideArea;

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GlowBackground cx="50%" cy="0%" r="45%" opacity={0.1} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{t("home.hello")}</Text>
            <Text style={styles.headerSub}>{t("home.whatNeeded")}</Text>
          </View>
          <HeaderActions />
        </View>

        {activeBooking && (
          <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: activeBooking.id })} style={styles.activeCard}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={styles.liveDotWrap}>
                  <Animated.View style={[styles.livePulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
                  <View style={styles.liveDot} />
                </View>
                <Text style={styles.activeLabel}>{t("home.activeJob")}</Text>
              </View>
              <Text style={styles.activeTitle} numberOfLines={1}>
                {activeBooking.jobTitle}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{enumLabel(td, "booking", activeBooking.status).toUpperCase()}</Text>
            </View>
          </Pressable>
        )}

        {outsideArea && (
          <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
            <WaitlistCard title={t("market.outsideTitle")} body={t("market.outsideBody")} role="CUSTOMER" city={market.city} />
          </View>
        )}

        {!outsideArea && <View style={styles.heroRow}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              haptic.light();
              navigation.navigate("PostJob");
            }}
          >
            <LinearGradient
              colors={["#FFCF7A", colors.accent, colors.accentDeep]}
              locations={[...accentGradientStops]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroPlus}>+</Text>
              <Text style={styles.heroTitle}>{t("home.postJob")}</Text>
              <Text style={styles.heroSub}>{t("home.postJobSub")}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.emergency}
            onPress={() => {
              haptic.light();
              navigation.navigate("PostJob", { urgency: "EMERGENCY" });
            }}
          >
            <Text style={{ fontSize: 22 }}>⚡</Text>
            <Text style={styles.emergencyText}>{t("home.emergency")}</Text>
          </Pressable>
        </View>}

        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <RewardedDiscountCard
            state={discount}
            onReward={async () => {
              // The server enforces 2 per rolling 7 days and one credit per booking.
              const next = await api.claimAdDiscount();
              setDiscount(next);
            }}
          />
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          <NativeAdStrip />
        </View>

        {!outsideArea && <Text style={styles.sectionTitle}>{t("home.browseTrades")}</Text>}

        {outsideArea ? null : loading ? (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 24 }} />
        ) : error ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: colors.dangerSoft, textAlign: "center", marginBottom: 12 }}>{error}</Text>
            <Chip label={t("common.tryAgain")} onPress={load} />
          </View>
        ) : (
          <View style={styles.grid}>
            {categories.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.tile, !item.available && { opacity: 0.55 }]}
                onPress={() => (item.available ? navigation.navigate("PostJob", { categoryId: item.id }) : setComingSoon(item))}
              >
                <AnimatedTradeIcon icon={item.icon} trade={item.trade} size={26} />
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {item.name}
                </Text>
                {!item.available && <Text style={styles.soon}>{t("market.comingSoon")}</Text>}
              </Pressable>
            ))}
          </View>
        )}
        {comingSoon && !outsideArea && (
          <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
            <WaitlistCard
              key={comingSoon.id}
              title={`${comingSoon.name} · ${t("market.comingSoon")}`}
              body={t("market.comingSoonBody", { service: comingSoon.name })}
              trade={comingSoon.trade}
              role="CUSTOMER"
              city={market.city}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { color: colors.text, fontSize: 21, fontWeight: "800" },
  headerSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  activeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: "rgba(30,194,139,0.08)",
    borderWidth: 1,
    borderColor: "rgba(30,194,139,0.3)",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    gap: 10,
  },
  liveDotWrap: { width: 8, height: 8, alignItems: "center", justifyContent: "center" },
  livePulse: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  activeLabel: { color: colors.success, fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  activeTitle: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 },
  statusPill: { backgroundColor: "rgba(30,194,139,0.15)", borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  statusPillText: { color: colors.success, fontSize: 10, fontWeight: "700" },
  heroRow: { flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 16 },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  heroPlus: { fontSize: 26, fontWeight: "300", lineHeight: 28, color: colors.accentForeground },
  heroTitle: { fontSize: 16, fontWeight: "800", color: colors.accentForeground, marginTop: 10 },
  heroSub: { fontSize: 11, fontWeight: "600", color: "rgba(21,18,10,0.75)", marginTop: 2 },
  emergency: {
    width: 110,
    borderRadius: 18,
    backgroundColor: colors.dangerTint,
    borderWidth: 1,
    borderColor: "rgba(220,60,60,0.3)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  emergencyText: { color: colors.dangerSoft, fontWeight: "800", fontSize: 13, textAlign: "center" },
  sectionTitle: { color: "#D9D2C4", fontSize: 14, fontWeight: "700", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 18 },
  tile: {
    width: "31.2%",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  soon: { color: colors.accent, fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  tileLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "600", textAlign: "center" },
});

