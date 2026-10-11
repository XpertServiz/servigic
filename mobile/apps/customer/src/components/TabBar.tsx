// Bottom navigation in the redesign's style: elevated surface, hairline amber
// top border, amber active state. Shared verbatim by apps/customer and apps/pro.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/theme";
import { Icon, type IconName } from "./Icon";
import { haptic } from "./ds";

export function AppTabBar({
  state,
  descriptors,
  navigation,
  icons,
}: BottomTabBarProps & { icons: Record<string, IconName> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const color = focused ? colors.accent : "#8A8378";
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptic.light();
                navigation.navigate(route.name, route.params);
              }
            }}
            style={styles.item}
          >
            <Icon name={icons[route.name] ?? "home"} size={20} color={color} strokeWidth={focused ? 2 : 1.8} />
            <Text style={[styles.label, { color }, focused && { fontWeight: "700" }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,166,35,0.1)",
  },
  item: { flex: 1, alignItems: "center", gap: 4 },
  label: { fontSize: 11 },
});
