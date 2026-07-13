// Shared design-system layer for the redesign (servigic-app-redesign-spec-v1).
// Not a real npm workspace package — copied verbatim between
// apps/customer/src/components/ds.tsx and apps/pro/src/components/ds.tsx.
// If you change one, copy the change to the other.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, radius } from "../lib/theme";
import * as Haptics from "expo-haptics";

// Every native haptics call is guarded — a misbehaving/unavailable haptics
// engine on a given device must never be able to interrupt a tap handler.
export const haptic = {
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  },
};

// ─── PriceText ───
export function PriceText({
  pkr,
  size = "lg",
  color = colors.text,
}: {
  pkr: number;
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
}) {
  const fontSize = { sm: 16, md: 20, lg: 28, xl: 40 }[size];
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
      <Text style={{ color, fontSize: fontSize * 0.4, fontWeight: "700" }}>PKR</Text>
      <Text style={{ color, fontSize, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
        {pkr.toLocaleString()}
      </Text>
    </View>
  );
}

// ─── StatusPillTimeline ───
export function StatusPillTimeline({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  return (
    <View style={styles.timelineRow}>
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <React.Fragment key={label}>
            <View style={styles.timelineStep}>
              <View
                style={[
                  styles.timelineDot,
                  done && { backgroundColor: colors.secondary },
                  active && { backgroundColor: colors.accent },
                  !done && !active && { backgroundColor: colors.border },
                ]}
              >
                {done && <Text style={{ color: "#06170D", fontSize: 11, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.timelineLabel,
                  (done || active) && { color: colors.text },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.timelineBar, done && { backgroundColor: colors.secondary }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── RatingStars ───
export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text key={n} style={{ fontSize: size, color: n <= Math.round(rating) ? colors.accent : colors.border }}>
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── CountdownRing ───
export function CountdownRing({
  totalSeconds,
  remainingSeconds,
  size = 56,
  color = colors.accent,
  children,
}: {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - pct)}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ─── EmptyState ───
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 12, opacity: 0.6 }}>{icon}</Text>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, textAlign: "center" }}>{title}</Text>
      {subtitle && (
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 6 }}>{subtitle}</Text>
      )}
    </View>
  );
}

// ─── SegmentedControl ───
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmentRow}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => {
            haptic.light();
            onChange(o.value);
          }}
          style={[styles.segmentItem, value === o.value && styles.segmentItemActive]}
        >
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Chip ───
export function Chip({
  label,
  active,
  onPress,
  tone = "accent",
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: "accent" | "danger" | "secondary";
}) {
  const toneColor = { accent: colors.accent, danger: colors.danger, secondary: colors.secondary }[tone];
  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          haptic.light();
          onPress();
        }
      }}
      style={[
        styles.chip,
        active && { borderColor: toneColor, backgroundColor: `${toneColor}1A` },
      ]}
    >
      <Text style={{ color: active ? toneColor : colors.textMuted, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// ─── ProviderAvatar ───
export function ProviderAvatar({ name, ratingAvg = 0, size = 44 }: { name: string; ratingAvg?: number; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const ringColor = ratingAvg >= 4.5 ? colors.secondary : ratingAvg >= 3.5 ? colors.accent : colors.border;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: ringColor,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bgElevated2,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

// ─── SheetCard: card styled to look like the top of a bottom sheet ───
export function SheetCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.sheetCard, style]}>
      <View style={styles.sheetHandle} />
      {children}
    </View>
  );
}

// ─── ConfettiBurst: one-shot, ~2s, no loop, no audio ───
const CONFETTI_COLORS = [colors.accent, colors.secondary, colors.info, "#fff"];

export function ConfettiBurst({ trigger }: { trigger: number }) {
  const pieces = useRef(
    Array.from({ length: 24 }, () => ({
      x: Math.random() * 300 - 150,
      delay: Math.random() * 150,
      rotate: Math.random() * 360,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      anim: new Animated.Value(0),
    }))
  ).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger <= 0) return;
    setShow(true);
    const animations = pieces.map((p) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 1400,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.stagger(10, animations).start(() => setShow(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!show) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 400] });
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              width: 8,
              height: 8,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity,
              transform: [
                { translateX },
                { translateY },
                { rotate: `${p.rotate}deg` },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timelineRow: { flexDirection: "row", alignItems: "flex-start" },
  timelineStep: { alignItems: "center", width: 64 },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLabel: { color: colors.textMuted, fontSize: 10, marginTop: 4, textAlign: "center" },
  timelineBar: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 10 },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.button,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: radius.button - 4, alignItems: "center" },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  segmentTextActive: { color: colors.accentForeground },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button - 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sheetCard: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
});
