// The 3D artwork of the home-screen trade tiles (assets/trades). Trades without artwork fall back to the category emoji.
import type { ImageSourcePropType } from "react-native";

export const TRADE_ART: Record<string, ImageSourcePropType> = {
  AC_TECHNICIAN: require("../../assets/trades/ac_technician.webp"),
  APPLIANCE_REPAIR: require("../../assets/trades/appliance_repair.webp"),
  CAR_MECHANIC: require("../../assets/trades/car_mechanic.webp"),
  TOWING: require("../../assets/trades/car_towing.webp"),
  CARPENTER: require("../../assets/trades/carpenter.webp"),
  CLEANER: require("../../assets/trades/cleaner.webp"),
  ELECTRICIAN: require("../../assets/trades/electrician.webp"),
  HANDYMAN: require("../../assets/trades/handyman.webp"),
  MASON: require("../../assets/trades/mason.webp"),
  MOVERS: require("../../assets/trades/movers.webp"),
  PAINTER: require("../../assets/trades/painter.webp"),
  PLUMBER: require("../../assets/trades/plumber.webp"),
};
