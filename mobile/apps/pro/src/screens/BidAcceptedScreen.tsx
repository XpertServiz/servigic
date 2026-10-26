// Celebration shown when a customer accepts the pro's bid (D3-BidWon).
import React, { useEffect, useRef, useState } from "react";
import { currencyCode, useCurrencyCode } from "../lib/currency";
import { View, Text, Pressable, Animated, Easing, StyleSheet, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { GlowBackground, GradientButton, ProviderAvatar, haptic } from "../components/ds";
import { Icon } from "../components/Icon";
import { sound } from "../lib/sound";
import { colors } from "../lib/theme";
import { navigateRoot } from "../navigation/ref";
import { useT } from "../lib/i18n";
import type { BookingData } from "./booking/types";

type Props = NativeStackScreenProps<RootStackParamList, "BidAccepted">;

export default function BidAcceptedScreen({ route, navigation }: Props) {
  useCurrencyCode(); // re-render when the currency (SAR, PKR ...) becomes known
  const t = useT();
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<BookingData | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    sound.bidAccepted();
    haptic.success();
    api
      .getBookingDetail(bookingId)
      .then(({ booking: b }) => setBooking(b as unknown as BookingData))
      .catch(() => {});
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bookingId, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const full = booking?.revealStage === "FULL";

  function startJob() {
    navigation.goBack();
    navigateRoot("Main", { screen: "JobsTab", params: { screen: "BookingDetail", params: { bookingId } } });
  }

  return (
    <View style={styles.root}>
      <GlowBackground cy="28%" opacity={0.14} />
      <View style={[styles.badgeRow, { paddingTop: insets.top + 20 }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t("bidWon.badge")}</Text>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.checkWrap}>
          <Animated.View style={[styles.checkPulse, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <View style={styles.check}>
            <Icon name="check" size={40} color={colors.accentForeground} />
          </View>
        </View>
        <Text style={styles.title}>{t("bidWon.title")}</Text>
        {booking && (
          <Text style={styles.body}>
            {booking.jobTitle} · {currencyCode()} {booking.totalPKR.toLocaleString()}
            {"\n"}
            {t("bidWon.body")}
          </Text>
        )}
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        {booking && (
          <View style={styles.person}>
            <ProviderAvatar name={booking.otherPartyName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{booking.otherPartyName}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{booking.areaLabel ?? ""}</Text>
            </View>
            {full && !!booking.otherPartyPhone && (
              <Pressable onPress={() => Linking.openURL(`tel:${booking.otherPartyPhone}`)} style={styles.roundBtn} accessibilityLabel={t("common.call")}>
                <Icon name="phone" size={16} />
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                navigation.goBack();
                navigateRoot("Main", {
                  screen: "JobsTab",
                  params: { screen: "MessageThread", params: { bookingId, otherPartyName: booking.otherPartyName } },
                });
              }}
              style={styles.roundBtn}
              accessibilityLabel={t("common.message")}
            >
              <Icon name="chat" size={16} />
            </Pressable>
          </View>
        )}
        <GradientButton title={t("bidWon.startJob")} onPress={startJob} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  badgeRow: { paddingHorizontal: 18 },
  badge: { alignSelf: "flex-start", backgroundColor: "rgba(245,166,35,0.14)", borderWidth: 1, borderColor: "rgba(245,166,35,0.4)", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13 },
  badgeText: { color: colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  checkWrap: { width: 84, height: 84, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  checkPulse: { position: "absolute", width: 84, height: 84, borderRadius: 42, backgroundColor: colors.accent },
  check: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,166,35,0.15)",
    gap: 16,
  },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(245,166,35,0.07)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.2)",
    borderRadius: 14,
    padding: 12,
  },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
});
