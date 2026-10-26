import { useEffect } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import * as api from "./api";

const EVERY_MS = 5 * 60 * 1000;

/** While the pro is online and the app is open: send his position now, every 5 minutes, and whenever the app comes back to the front. */
export function useLiveLocation(online: boolean) {
  useEffect(() => {
    if (!online) return;
    let stopped = false;
    const send = async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted || stopped) return;
        const pos = (await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000 })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (pos && !stopped) await api.reportLocation(pos.coords.latitude, pos.coords.longitude);
      } catch {
        // Matching still works from his saved work location.
      }
    };
    send();
    const timer = setInterval(send, EVERY_MS);
    const sub = AppState.addEventListener("change", (s) => s === "active" && send());
    return () => {
      stopped = true;
      clearInterval(timer);
      sub.remove();
    };
  }, [online]);
}
