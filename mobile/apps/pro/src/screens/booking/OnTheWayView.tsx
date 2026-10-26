// "On the way" layout (D3-OnTheWay): live map with the pro's bike marker and the
// customer's destination pin, an ETA pill, the customer card and one big CTA.
// Also used for CONFIRMED (CTA = start driving) and ARRIVED (CTA = start work).
import React from "react";
import { currencyCode, useCurrencyCode } from "../../lib/currency";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import MapView, { Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { GlassCard, GradientButton, ProviderAvatar, StatusStepper } from "../../components/ds";
import { DestinationMarker, TrackedBikeMarker } from "../../components/MapPins";
import { Icon } from "../../components/Icon";
import { DraggableSheet } from "../../components/DraggableSheet";
import { colors, mapStyle, mapProvider } from "../../lib/theme";
import { enumLabel, STATUS_STEPS, statusStepIndex } from "../../lib/status";
import { useI18n } from "../../lib/i18n";
import type { BookingActions, BookingData } from "./types";

const AVERAGE_SPEED_KMH = 22; // rough urban two-wheeler speed — an estimate, labelled as such

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function OnTheWayView({
  booking,
  actions,
  myLocation,
  ctaLabel,
  canCancel,
}: {
  booking: BookingData;
  actions: BookingActions;
  myLocation: { lat: number; lng: number } | null;
  ctaLabel: string;
  canCancel: boolean;
}) {
  useCurrencyCode(); // re-render when the currency (SAR, PKR ...) becomes known
  const { t, td } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dest = { latitude: booking.jobLat, longitude: booking.jobLng };

  const etaMin = myLocation
    ? Math.max(1, Math.round((distanceKm(myLocation.lat, myLocation.lng, dest.latitude, dest.longitude) / AVERAGE_SPEED_KMH) * 60))
    : null;
  const stepLabels = STATUS_STEPS.map((s) => enumLabel(td, "booking", s));
  const full = booking.revealStage === "FULL";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={mapProvider}
        customMapStyle={mapStyle}
        initialRegion={{ ...dest, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        toolbarEnabled={false}
        showsCompass={false}
        pitchEnabled={false}
      >
        <DestinationMarker coordinate={dest} />
        {myLocation && (
          <>
            <Polyline
              coordinates={[{ latitude: myLocation.lat, longitude: myLocation.lng }, dest]}
              strokeColor={colors.accent}
              strokeWidth={3}
              lineDashPattern={[2, 8]}
              lineCap="round"
            />
            <TrackedBikeMarker location={myLocation} label={t("map.you")} />
          </>
        )}
      </MapView>

      <View style={[styles.top, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => navigation.goBack()} style={styles.roundBtn} accessibilityLabel={t("common.back")}>
            <Icon name="back" size={16} />
          </Pressable>
          <GlassCard style={styles.etaPill}>
            <Text style={styles.etaText}>{etaMin != null ? t("map.eta", { n: etaMin }) : enumLabel(td, "booking", booking.status)}</Text>
          </GlassCard>
        </View>
        {full && !!booking.otherPartyPhone && (
          <Pressable onPress={() => Linking.openURL(`tel:${booking.otherPartyPhone}`)} style={styles.roundBtn} accessibilityLabel={t("common.call")}>
            <Icon name="phone" size={16} />
          </Pressable>
        )}
      </View>

      <DraggableSheet
        initialSnap="half"
        peek={
          <View style={{ gap: 12, paddingBottom: 6 }}>
            <View style={styles.personRow}>
              <ProviderAvatar name={booking.otherPartyName} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>{booking.otherPartyName}</Text>
                <Text style={styles.personSub} numberOfLines={1}>
                  {booking.jobTitle} · {currencyCode()} {booking.totalPKR.toLocaleString()}
                </Text>
              </View>
              <Pressable onPress={actions.openMessages} style={styles.roundBtnLight} accessibilityLabel={t("common.message")}>
                <Icon name="chat" size={16} />
              </Pressable>
            </View>
            {/* The main action stays reachable even with the sheet pulled down to the full map. */}
            <GradientButton title={ctaLabel} onPress={actions.advance} disabled={actions.busy} />
          </View>
        }
      >
        <StatusStepper labels={stepLabels} activeIndex={statusStepIndex(booking.status)} />

        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>{t("booking.jobAddress")}</Text>
          <Text style={styles.addressValue}>{booking.exactAddress ?? booking.areaLabel ?? t("booking.addressLocked")}</Text>
          {!booking.exactAddress && <Text style={styles.addressHint}>{t("booking.addressHint")}</Text>}
        </View>

        <View style={styles.linksRow}>
          {full && booking.exactAddress && (
            <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${booking.jobLat},${booking.jobLng}`)}>
              <Text style={styles.link}>{t("booking.navigate")}</Text>
            </Pressable>
          )}
          {canCancel && (
            <Pressable onPress={actions.openCancel}>
              <Text style={[styles.link, { color: colors.dangerSoft }]}>{t("booking.cancel")}</Text>
            </Pressable>
          )}
        </View>
      </DraggableSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roundBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(20,18,16,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  roundBtnLight: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  etaPill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "rgba(245,166,35,0.14)", borderColor: "rgba(245,166,35,0.4)" },
  etaText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  personName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  personSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  addressCard: { backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 },
  addressLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 3 },
  addressValue: { color: colors.text, fontSize: 13, fontWeight: "600" },
  addressHint: { color: colors.textFainter, fontSize: 11, marginTop: 4 },
  linksRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -2 },
  link: { color: colors.accent, fontSize: 13, fontWeight: "700" },
});
