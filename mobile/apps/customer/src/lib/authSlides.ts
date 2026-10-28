// Pictures behind the sign-in / sign-up screens, by the country of the phone number (see components/AuthBackdrop.tsx).
// Saudi Arabia: the Servigic artwork. Other countries: royalty-free photos of that country (Pexels licence, see assets/auth/world/SOURCES.txt).
// Any other country: neutral home-service pictures. To add a country: put its photos in assets/auth/world and add a line below.
import type { ImageSourcePropType } from "react-native";

const SA: ImageSourcePropType[] = [require("../../assets/auth/sa/1.webp"), require("../../assets/auth/sa/2.webp"), require("../../assets/auth/sa/3.webp"), require("../../assets/auth/sa/4.webp"), require("../../assets/auth/sa/5.webp"), require("../../assets/auth/sa/6.webp"), require("../../assets/auth/sa/7.webp"), require("../../assets/auth/sa/8.webp"), require("../../assets/auth/sa/9.webp"), require("../../assets/auth/sa/10.webp")];
const PK: ImageSourcePropType[] = [require("../../assets/auth/world/pk_1.webp"), require("../../assets/auth/world/pk_2.webp"), require("../../assets/auth/world/pk_3.webp"), require("../../assets/auth/world/pk_4.webp"), require("../../assets/auth/world/pk_5.webp"), require("../../assets/auth/world/pk_6.webp"), require("../../assets/auth/world/pk_7.webp"), require("../../assets/auth/world/pk_8.webp")];
const AE: ImageSourcePropType[] = [require("../../assets/auth/world/ae_1.webp"), require("../../assets/auth/world/ae_2.webp"), require("../../assets/auth/world/ae_3.webp")];
const QA: ImageSourcePropType[] = [require("../../assets/auth/world/qa_1.webp"), require("../../assets/auth/world/qa_2.webp"), require("../../assets/auth/world/qa_3.webp")];
const CA: ImageSourcePropType[] = [require("../../assets/auth/world/ca_1.webp"), require("../../assets/auth/world/ca_2.webp"), require("../../assets/auth/world/ca_3.webp")];
const US: ImageSourcePropType[] = [require("../../assets/auth/world/us_1.webp"), require("../../assets/auth/world/us_2.webp"), require("../../assets/auth/world/us_3.webp")];
const NEUTRAL: ImageSourcePropType[] = [SA[1], SA[2], SA[6], SA[9]];
const BY_COUNTRY: Record<string, ImageSourcePropType[]> = { SA, PK, AE, QA, CA, US };

export function slidesFor(country?: string | null): ImageSourcePropType[] {
  return BY_COUNTRY[(country ?? "").toUpperCase()] ?? NEUTRAL;
}
