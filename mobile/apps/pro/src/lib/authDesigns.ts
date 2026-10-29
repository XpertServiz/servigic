// The sign-in / sign-up designs. One is chosen at random each time the screen opens, so the app looks different every time.
// Pictures: the Servigic artwork (assets/auth/sa). To add a design, add its picture and a line below.
import { useState } from "react";
import type { ImageSourcePropType } from "react-native";
import type { AuthExtrasKind } from "../components/AuthExtras";

export type AuthDesign = { image: ImageSourcePropType; headline?: string; headlineAr?: string; extras: AuthExtrasKind };

export const AUTH_DESIGNS: AuthDesign[] = [
  { image: require("../../assets/auth/sa/1.webp"), extras: "trades" },
  { image: require("../../assets/auth/sa/2.webp"), extras: "trades" },
  { image: require("../../assets/auth/sa/3.webp"), extras: "tradesRing" },
  { image: require("../../assets/auth/sa/4.webp"), extras: "tradesRing" },
  { image: require("../../assets/auth/sa/5.webp"), extras: "trades" },
  { image: require("../../assets/auth/sa/6.webp"), extras: "trades" },
  { image: require("../../assets/auth/sa/7.webp"), extras: "tradesRing" },
  { image: require("../../assets/auth/sa/8.webp"), extras: "tradesRing" },
  { image: require("../../assets/auth/sa/9.webp"), extras: "trades" },
];

export function useAuthDesign(): AuthDesign {
  return useState(() => AUTH_DESIGNS[Math.floor(Math.random() * AUTH_DESIGNS.length)])[0];
}
