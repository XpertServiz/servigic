// The Admin sign-in shows every picture of the Customer and Pro apps and of every country, mixed, whatever the phone country.
import type { ImageSourcePropType } from "react-native";

const ALL: ImageSourcePropType[] = [
  require("../../assets/auth/pro/1.webp"),
  require("../../assets/auth/customer/1.webp"),
  require("../../assets/auth/world/pk_1.webp"),
  require("../../assets/auth/world/ae_1.webp"),
  require("../../assets/auth/world/qa_1.webp"),
  require("../../assets/auth/world/ca_1.webp"),
  require("../../assets/auth/world/us_1.webp"),
  require("../../assets/auth/pro/2.webp"),
  require("../../assets/auth/customer/2.webp"),
  require("../../assets/auth/world/pk_2.webp"),
  require("../../assets/auth/world/ae_2.webp"),
  require("../../assets/auth/world/qa_2.webp"),
  require("../../assets/auth/world/ca_2.webp"),
  require("../../assets/auth/world/us_2.webp"),
  require("../../assets/auth/pro/3.webp"),
  require("../../assets/auth/customer/3.webp"),
  require("../../assets/auth/world/pk_3.webp"),
  require("../../assets/auth/world/ae_3.webp"),
  require("../../assets/auth/world/qa_3.webp"),
  require("../../assets/auth/world/ca_3.webp"),
  require("../../assets/auth/world/us_3.webp"),
  require("../../assets/auth/pro/4.webp"),
  require("../../assets/auth/customer/4.webp"),
  require("../../assets/auth/world/pk_4.webp"),
  require("../../assets/auth/pro/5.webp"),
  require("../../assets/auth/customer/5.webp"),
  require("../../assets/auth/world/pk_5.webp"),
  require("../../assets/auth/pro/6.webp"),
  require("../../assets/auth/customer/6.webp"),
  require("../../assets/auth/world/pk_6.webp"),
  require("../../assets/auth/pro/7.webp"),
  require("../../assets/auth/customer/7.webp"),
  require("../../assets/auth/world/pk_7.webp"),
  require("../../assets/auth/pro/8.webp"),
  require("../../assets/auth/customer/8.webp"),
  require("../../assets/auth/world/pk_8.webp"),
  require("../../assets/auth/pro/9.webp"),
  require("../../assets/auth/customer/9.webp"),
  require("../../assets/auth/customer/10.webp"),
];

export function slidesFor(_country?: string | null): ImageSourcePropType[] {
  return ALL;
}
