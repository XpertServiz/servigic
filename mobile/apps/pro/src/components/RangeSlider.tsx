// Simple horizontal slider (no native module). Shared by apps/customer and apps/pro.
// Drag the thumb or tap the track; `onChange` fires continuously, `onChangeEnd` once when the finger lifts.
import React, { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { colors } from "../lib/theme";

const THUMB = 28;

export function RangeSlider({
  min,
  max,
  value,
  onChange,
  onChangeEnd,
  step = 1,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  onChangeEnd?: (v: number) => void;
  step?: number;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const latest = useRef(value);
  latest.current = value;

  const pan = useMemo(() => {
    const toValue = (x: number) => {
      const usable = Math.max(1, widthRef.current - THUMB);
      const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / usable));
      const raw = min + ratio * (max - min);
      return Math.min(max, Math.max(min, Math.round(raw / step) * step));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Stay in charge when the slider sits inside a ScrollView.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const v = toValue(e.nativeEvent.locationX);
        latest.current = v;
        onChange(v);
      },
      onPanResponderMove: (e) => {
        const v = toValue(e.nativeEvent.locationX);
        if (v !== latest.current) {
          latest.current = v;
          onChange(v);
        }
      },
      onPanResponderRelease: () => onChangeEnd?.(latest.current),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, step]);

  function onLayout(e: LayoutChangeEvent) {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  }

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const left = ratio * Math.max(0, width - THUMB);
  return (
    <View style={styles.hit} onLayout={onLayout} {...pan.panHandlers} accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value }}>
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: left + THUMB / 2 }]} />
      </View>
      <View style={[styles.thumb, { left }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: "center" },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.accent },
  thumb: {
    position: "absolute",
    top: 8,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.bgElevated,
    elevation: 4,
  },
});
