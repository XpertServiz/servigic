// Draggable bottom sheet with three snap points, used over full-screen maps (Pro Home, the pro's On-the-way
// screen and the customer's live tracking). Shared verbatim by apps/customer and apps/pro.
//
//   collapsed - only the drag handle and the "peek" row show, the map is almost full screen
//   half      - about half the screen
//   expanded  - nearly full height; the body scrolls
//
// Drag the handle/peek row up or down (it follows the finger, then springs to the nearest snap point, taking
// the swipe speed into account), or tap the floating "Full map" button to collapse and tap it again to come back.
// Built on Animated + PanResponder so it needs no native gesture library.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { haptic } from "./ds";

export type SheetSnap = "collapsed" | "half" | "expanded";

export function DraggableSheet({
  peek,
  children,
  initialSnap = "half",
  showFullMapButton = true,
  onSnapChange,
}: {
  /** Always-visible row under the handle (title, status, key number). */
  peek: React.ReactNode;
  /** The rest of the content - scrolls inside the sheet. */
  children: React.ReactNode;
  initialSnap?: SheetSnap;
  showFullMapButton?: boolean;
  onSnapChange?: (snap: SheetSnap) => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [peekHeight, setPeekHeight] = useState(64);
  const [snap, setSnap] = useState<SheetSnap>(initialSnap);
  const lastOpenSnap = useRef<SheetSnap>(initialSnap === "collapsed" ? "half" : initialSnap);

  const HANDLE = 26;
  const heights = useMemo(
    () => ({
      collapsed: HANDLE + peekHeight + Math.max(insets.bottom, 12),
      half: Math.max(windowHeight * 0.5, HANDLE + peekHeight + 140),
      expanded: Math.max(windowHeight * 0.88 - insets.top, windowHeight * 0.6),
    }),
    [windowHeight, peekHeight, insets.bottom, insets.top],
  );
  const heightsRef = useRef(heights);
  heightsRef.current = heights;

  const height = useRef(new Animated.Value(heights[initialSnap])).current;
  const startHeight = useRef(0);
  const current = useRef(heights[initialSnap]);

  useEffect(() => {
    const id = height.addListener(({ value }) => {
      current.current = value;
    });
    return () => height.removeListener(id);
  }, [height]);

  const goTo = useCallback(
    (target: SheetSnap, animate = true) => {
      setSnap(target);
      if (target !== "collapsed") lastOpenSnap.current = target;
      onSnapChange?.(target);
      if (animate) Animated.spring(height, { toValue: heightsRef.current[target], useNativeDriver: false, bounciness: 4, speed: 14 }).start();
      else height.setValue(heightsRef.current[target]);
    },
    [height, onSnapChange],
  );

  // Keep the sheet on its snap point when the measured sizes change (peek row grows, rotation, keyboard).
  useEffect(() => {
    height.setValue(heights[snap]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heights]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          height.stopAnimation((v) => {
            startHeight.current = v;
          });
        },
        onPanResponderMove: (_e, g) => {
          const h = heightsRef.current;
          // Dragging up (negative dy) grows the sheet. A little resistance past either end.
          const raw = startHeight.current - g.dy;
          const clamped = Math.min(h.expanded + 24, Math.max(h.collapsed - 24, raw));
          height.setValue(clamped);
        },
        onPanResponderRelease: (_e, g) => {
          const h = heightsRef.current;
          // Project where the finger was heading (vy > 0 means moving down = shrinking) and snap to the closest point.
          const projected = current.current - g.vy * 220;
          const options: SheetSnap[] = ["collapsed", "half", "expanded"];
          const best = options.reduce((a, b) => (Math.abs(h[b] - projected) < Math.abs(h[a] - projected) ? b : a));
          haptic.light();
          goTo(best);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goTo],
  );

  function onPeekLayout(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && Math.abs(h - peekHeight) > 1) setPeekHeight(h);
  }

  const collapsed = snap === "collapsed";
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {showFullMapButton && (
        <Animated.View style={[styles.fullMapWrap, { bottom: Animated.add(height, 12) }]} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              haptic.light();
              goTo(collapsed ? lastOpenSnap.current : "collapsed");
            }}
            style={styles.fullMap}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? t("sheet.showDetails") : t("sheet.fullMap")}
          >
            <Text style={styles.fullMapText}>{collapsed ? t("sheet.showDetails") : `⤢ ${t("sheet.fullMap")}`}</Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View style={[styles.sheet, { height }]}>
        {/* The drag zone: handle + the always-visible peek row. */}
        <View {...pan.panHandlers} style={styles.dragZone} collapsable={false}>
          <View style={styles.handleHit}>
            <View style={styles.handle} />
          </View>
          <View onLayout={onPeekLayout}>{peek}</View>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={snap !== "collapsed"}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,166,35,0.15)",
    overflow: "hidden",
  },
  dragZone: { paddingBottom: 6 },
  handleHit: { height: 26, alignItems: "center", justifyContent: "center" },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#4A4436" },
  fullMapWrap: { position: "absolute", right: 16 },
  fullMap: {
    backgroundColor: "rgba(20,18,16,0.92)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.4)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 6,
  },
  fullMapText: { color: colors.accent, fontSize: 12, fontWeight: "800" },
});
