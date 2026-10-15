// Market configuration (handoff §11.6). Shared verbatim by apps/customer and apps/pro.
//
// The backend decides which country/area is open and which categories are on there. The apps
// fetch that config at startup (and again once the user's city is known), cache it on the device
// so a flaky connection never blanks the screens, and use it to hide disabled categories / show
// "Coming soon" / show the "not in your area yet" waitlist screen.
import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import * as api from "./api";

const KEY = "servigic_market_config";
const TTL_MS = 60_000;
let memo: { cfg: api.MarketConfig; at: number; key: string } | null = null;

const keyFor = (city: string | null, point?: api.GeoPoint | null) => `${city ?? ""}|${point ? `${point.lat.toFixed(3)},${point.lng.toFixed(3)}` : ""}`;

/** `point` = the customer's GPS position or job pin: the server then checks it against the drawn zone geofence. */
export async function loadMarketConfig(city?: string | null, point?: api.GeoPoint | null): Promise<api.MarketConfig | null> {
  const wanted = city ?? null;
  const key = keyFor(wanted, point);
  if (memo && memo.key === key && Date.now() - memo.at < TTL_MS) return memo.cfg;
  try {
    const cfg = await api.getMarketConfig(wanted, point);
    memo = { cfg, at: Date.now(), key };
    SecureStore.setItemAsync(KEY, JSON.stringify(cfg)).catch(() => {});
    return cfg;
  } catch {
    // Offline / older backend: fall back to the last config we saw (or none = treat as open).
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      return raw ? (JSON.parse(raw) as api.MarketConfig) : null;
    } catch {
      return null;
    }
  }
}

/** The signed-in user's market config. `config === null` means "unknown" — callers should treat that as open. */
export function useMarketConfig(opts: { useGps?: boolean } = {}) {
  const [config, setConfig] = useState<api.MarketConfig | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [point, setPoint] = useState<api.GeoPoint | null>(null);
  const useGps = opts.useGps ?? false;
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let userCity: string | null = null;
    try {
      const { user } = await api.getMe();
      userCity = typeof user.city === "string" ? user.city : null;
    } catch {
      // not signed in yet — the geo-based config still works
    }
    setCity(userCity);
    // Customer app: where the customer actually is decides whether they are inside a service zone.
    let here: api.GeoPoint | null = null;
    if (useGps) {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === "granted") {
          const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
          if (pos) here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {
        // no GPS: fall back to the city name
      }
    }
    setPoint(here);
    setConfig(await loadMarketConfig(userCity, here));
    setLoading(false);
  }, [useGps]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { config, city, point, loading, refresh, outsideArea: config != null && !config.legacyOpen && !config.acceptingJobs };
}
