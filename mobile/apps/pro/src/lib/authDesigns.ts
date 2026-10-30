// The sign-in / sign-up designs. One is chosen at random each time the screen opens, so the app looks different every time.
// Pictures: the Servigic artwork (assets/auth/sa). To add a design, add its picture and a line below.
import { useEffect, useState } from "react";
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

/** How long each picture stays before the next one fades in (the design starts at a random one each time the screen opens). */
export const SLIDE_MS = 2000;

export function useAuthDesign(): AuthDesign {
  const [i, setI] = useState(() => Math.floor(Math.random() * AUTH_DESIGNS.length));
  useEffect(() => {
    const timer = setInterval(() => setI((x) => (x + 1) % AUTH_DESIGNS.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, []);
  return AUTH_DESIGNS[i];
}
