// The sign-in / sign-up designs. One is chosen at random each time the screen opens, so the app looks different every time.
// Pictures: the Servigic artwork (assets/auth/sa). To add a design, add its picture and a line below.
import { useState } from "react";
import type { ImageSourcePropType } from "react-native";
import type { AuthExtrasKind } from "../components/AuthExtras";

export type AuthDesign = { image: ImageSourcePropType; headline?: string; headlineAr?: string; extras: AuthExtrasKind };

export const AUTH_DESIGNS: AuthDesign[] = [
  { image: require("../../assets/auth/sa/1.webp"), headline: "Your Home. Our Care.", headlineAr: "خدمات منزلية موثوقة", extras: "trades" },
  { image: require("../../assets/auth/sa/2.webp"), headline: "Home Services Made Easy", headlineAr: "خدمات منزلية أصبحت أسهل", extras: "tradesRing" },
  { image: require("../../assets/auth/sa/3.webp"), headline: "Skilled Experts at Your Service", headlineAr: "خبراء مهرة في خدمتك", extras: "badgesA" },
  { image: require("../../assets/auth/sa/4.webp"), headline: "Book Your Home Services", headlineAr: "احجز خدمات منزلك", extras: "tradesRing" },
  { image: require("../../assets/auth/sa/5.webp"), headline: "Home Services in Your Hand", headlineAr: "خدمات منزلك في متناول يدك", extras: "badgesB" },
  { image: require("../../assets/auth/sa/6.webp"), headline: "Complete Home Maintenance", headlineAr: "صيانة منزلية بشكل كامل", extras: "badgesB" },
  { image: require("../../assets/auth/sa/7.webp"), headline: "Better Homes Happier Lives", headlineAr: "بيوت أفضل .. حياة أسعد", extras: "trades" },
  { image: require("../../assets/auth/sa/8.webp"), headline: "Reliable Services For Your Home", headlineAr: "خدمات موثوقة لمنزلك", extras: "tradesRing" },
  { image: require("../../assets/auth/sa/9.webp"), headline: "Your Trusted Home Service Partner", headlineAr: "شريكك الموثوق في خدمات المنزل", extras: "badgesA" },
  { image: require("../../assets/auth/sa/10.webp"), headline: "Comfort at Home", headlineAr: "راحة في منزلك", extras: "trades" },
];

export function useAuthDesign(): AuthDesign {
  return useState(() => AUTH_DESIGNS[Math.floor(Math.random() * AUTH_DESIGNS.length)])[0];
}
