// Shared design-system layer for the "Premium-Dark Evolution" redesign
// (SERVIGIC_REDESIGN_HANDOFF.md §1). Not a real npm workspace package — copied
// verbatim between apps/customer/src/components/ds.tsx and
// apps/pro/src/components/ds.tsx. If you change one, copy the change to the other.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, accentGradient, accentGradientStops } from "../lib/theme";
import * as Haptics from "expo-haptics";
import { Icon } from "./Icon";
import { currencyCode, useCurrencyCode } from "../lib/currency";

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

// ─── GlowBackground: subtle radial amber ambiance behind key screens ───
// Ambiance, not a spotlight — keep opacity low.
export function GlowBackground({
  cx = "50%",
  cy = "30%",
  r = "55%",
  opacity = 0.16,
}: {
  cx?: string;
  cy?: string;
  r?: string;
  opacity?: number;
}) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="glow" cx={cx} cy={cy} r={r} gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={opacity} />
          <Stop offset="1" stopColor={colors.bg} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
    </Svg>
  );
}

// ─── GlassCard: floating status pills / trust cards over the map ───
export function GlassCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

// ─── GradientButton: the CTA. Amber 135° gradient with a soft glow ───
export function GradientButton({
  title,
  onPress,
  disabled,
  children,
  style,
  compact,
}: {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptic.light();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [styles.ctaWrap, !disabled && styles.ctaGlow, { opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}
    >
      <LinearGradient
        colors={[...accentGradient]}
        locations={[...accentGradientStops]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cta, compact && { paddingVertical: 11, borderRadius: 11 }]}
      >
        {children ?? <Text style={[styles.ctaText, compact && { fontSize: 14 }]}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

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
  const cur = useCurrencyCode();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
      <Text style={{ color, fontSize: fontSize * 0.4, fontWeight: "700" }}>{cur}</Text>
      <Text style={{ color, fontSize, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{pkr.toLocaleString()}</Text>
    </View>
  );
}

// ─── StatusStepper ───
// The 5-step status vocabulary shared by both apps (Confirmed → On the way →
// Arrived → Working → Done): green check = completed, pulsing amber = current,
// dark gray = pending. `activeIndex` ≥ labels.length means everything is done.
export function StatusStepper({ labels, activeIndex }: { labels: string[]; activeIndex: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const last = labels.length - 1;

  return (
    <View style={styles.stepperCard}>
      {labels.map((label, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <View key={`${i}-${label}`} style={styles.stepperItem}>
            <View style={styles.stepperDotWrap}>
              {current && i !== last && (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.stepperPulse, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
                />
              )}
              <View
                style={[
                  styles.stepperDot,
                  done && { backgroundColor: colors.success },
                  current && { backgroundColor: colors.accent },
                  current && i === last && { shadowColor: colors.accent, shadowOpacity: 0.7, shadowRadius: 8, elevation: 6 },
                  !done && !current && { backgroundColor: "#262219" },
                ]}
              >
                {done && <Icon name="check" size={12} color={colors.secondaryForeground} />}
                {current && i === last && <Icon name="check" size={12} color={colors.accentForeground} />}
              </View>
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.stepperLabel,
                done && { color: colors.textMuted },
                current && { color: colors.accent, fontWeight: "700" },
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Kept so any lingering import of the old name keeps working.
export function StatusPillTimeline({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return <StatusStepper labels={steps} activeIndex={activeIndex} />;
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
export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 12, opacity: 0.6 }}>{icon}</Text>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, textAlign: "center" }}>{title}</Text>
      {subtitle && <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 6 }}>{subtitle}</Text>}
    </View>
  );
}

// ─── TabsUnderline: Available / Booked / Done style tabs from the Jobs mock-up ───
export function TabsUnderline<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.tabsRow}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic.light();
              onChange(o.value);
            }}
            style={[styles.tabItem, active && { borderBottomColor: colors.accent }]}
          >
            <Text style={[styles.tabText, active && { color: colors.accent, fontWeight: "700" }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── SegmentedControl ───
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; tone?: "danger" }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmentRow}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic.light();
              onChange(o.value);
            }}
            style={[
              styles.segmentItem,
              o.tone === "danger" && { backgroundColor: colors.dangerTint },
              active && styles.segmentItemActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                o.tone === "danger" && { color: colors.dangerSoft },
                active && styles.segmentTextActive,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
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
      style={[styles.chip, active && { borderColor: toneColor, backgroundColor: `${toneColor}1F` }]}
    >
      <Text style={{ color: active ? toneColor : colors.textSecondary, fontWeight: active ? "800" : "600", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

// ─── ProviderAvatar: initial on a warm radial badge ───
export function ProviderAvatar({ name, ratingAvg = 0, size = 44 }: { name: string; ratingAvg?: number; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const ringColor = ratingAvg >= 4.5 ? colors.secondary : colors.accentBorder;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: ringColor,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(245,166,35,0.14)",
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

// ─── SheetCard: card styled to look like the top of a bottom sheet ───
export function SheetCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sheetCard, style]}>
      <View style={styles.sheetHandle} />
      {children}
    </View>
  );
}

// ─── ConfettiBurst: one-shot, ~2s, no loop, no audio ───
const CONFETTI_COLORS = [colors.accent, colors.accentSoft, colors.success, "#fff"];

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
              transform: [{ translateX }, { translateY }, { rotate: `${p.rotate}deg` }],
            }}
          />
        );
      })}
    </View>
  );
}

// ─── AnimatedTradeIcon: subtle looping motion for trade/category emoji icons
// ("moving hammer", "AC cooling waves", etc.) — the glyph itself can't be
// decomposed, so each style animates the icon as a whole (wiggle/rings/
// flicker/bounce) rather than trying to animate parts of the emoji.
const WIGGLE_TRADES = new Set(["PLUMBER", "CARPENTER", "HANDYMAN", "MASON", "WELDING", "TILING", "ROOFING", "UPHOLSTERY"]);
const WAVE_TRADES = new Set(["AC_TECHNICIAN", "WATER_TANK_CLEANING", "GENERATOR_REPAIR"]);
const FLICKER_TRADES = new Set(["ELECTRICIAN", "GLASS_REPAIR", "LOCKSMITH", "SOLAR_INSTALLER"]);

export function AnimatedTradeIcon({ icon, trade, size = 30 }: { icon: string; trade?: string; size?: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  if (trade && WIGGLE_TRADES.has(trade)) {
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["-16deg", "16deg"] });
    return <Animated.Text style={{ fontSize: size, transform: [{ rotate }] }}>{icon}</Animated.Text>;
  }

  if (trade && WAVE_TRADES.has(trade)) {
    const ringScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.55] });
    const ringOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
    return (
      <View style={{ width: size * 1.7, height: size * 1.7, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size,
            borderWidth: 1.5,
            borderColor: "#7dd3fc",
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          }}
        />
        <Text style={{ fontSize: size }}>{icon}</Text>
      </View>
    );
  }

  if (trade && FLICKER_TRADES.has(trade)) {
    const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.45, 1] });
    return <Animated.Text style={{ fontSize: size, opacity }}>{icon}</Animated.Text>;
  }

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  return <Animated.Text style={{ fontSize: size, transform: [{ translateY }] }}>{icon}</Animated.Text>;
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ctaWrap: { borderRadius: radius.button },
  ctaGlow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  cta: { paddingVertical: 16, borderRadius: radius.button, alignItems: "center", justifyContent: "center" },
  ctaText: { color: colors.accentForeground, fontWeight: "800", fontSize: 16 },
  stepperCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  stepperItem: { alignItems: "center", gap: 6, flex: 1 },
  stepperDotWrap: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  stepperDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepperPulse: { position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent },
  stepperLabel: { color: colors.textFainter, fontSize: 10, textAlign: "center" },
  tabsRow: { flexDirection: "row", gap: 22, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  tabItem: { paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  tabText: { color: colors.textFaint, fontSize: 13, fontWeight: "600" },
  segmentRow: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 5,
  },
  segmentItem: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 9, alignItems: "center" },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { color: "#8A8378", fontWeight: "600", fontSize: 12 },
  segmentTextActive: { color: colors.accentForeground, fontWeight: "800" },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: colors.bgElevated,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  sheetCard: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "rgba(245,166,35,0.15)",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2E2A22",
    alignSelf: "center",
    marginBottom: 16,
  },
});
