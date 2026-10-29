// The sign-in / sign-up designs. One is chosen at random each time the screen opens, so the app looks different every time.
// Pictures: the Servigic artwork (assets/auth/sa). To add a design, add its picture and a line below.
import { useState } from "react";
import type { ImageSourcePropType } from "react-native";

export type AuthDesign = { image: ImageSourcePropType; headline?: string; headlineAr?: string; extras?: string };

export const AUTH_DESIGNS: AuthDesign[] = [
  { image: require("../../assets/auth/pro/1.webp") },
  { image: require("../../assets/auth/pro/2.webp") },
  { image: require("../../assets/auth/pro/3.webp") },
  { image: require("../../assets/auth/pro/4.webp") },
  { image: require("../../assets/auth/pro/5.webp") },
  { image: require("../../assets/auth/pro/6.webp") },
  { image: require("../../assets/auth/pro/7.webp") },
  { image: require("../../assets/auth/pro/8.webp") },
  { image: require("../../assets/auth/pro/9.webp") },
  { image: require("../../assets/auth/customer/1.webp") },
  { image: require("../../assets/auth/customer/2.webp") },
  { image: require("../../assets/auth/customer/3.webp") },
  { image: require("../../assets/auth/customer/4.webp") },
  { image: require("../../assets/auth/customer/5.webp") },
  { image: require("../../assets/auth/customer/6.webp") },
  { image: require("../../assets/auth/customer/7.webp") },
  { image: require("../../assets/auth/customer/8.webp") },
  { image: require("../../assets/auth/customer/9.webp") },
  { image: require("../../assets/auth/customer/10.webp") },
];

export function useAuthDesign(): AuthDesign {
  return useState(() => AUTH_DESIGNS[Math.floor(Math.random() * AUTH_DESIGNS.length)])[0];
}
