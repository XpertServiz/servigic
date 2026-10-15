// Market configuration (handoff §11.6). Shared verbatim by apps/customer and apps/pro.
//
// The backend decides which country/area is open and which categories are on there. The apps
// fetch that config at startup (and again once the user's city is known), cache it on the device
// so a flaky connection never blanks the screens, and use it to hide disabled categories / show
// "Coming soon" / show the "not in your area yet" waitlist screen.
import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as api from "./api";

const KEY = "servigic_market_config";
const TTL_MS = 60_000;
let memo: { cfg: api.MarketConfig; at: number; city: string | null } | null = null;

export async function loadMarketConfig(city?: string | null): Promise<api.MarketConfig | null> {
  const wanted = city ?? null;
  if (memo && memo.city === wanted && Date.now() - memo.at < TTL_MS) return memo.cfg;
  try {
    const cfg = await api.getMarketConfig(wanted);
    memo = { cfg, at: Date.now(), city: wanted };
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
export function useMarketConfig() {
  const [config, setConfig] = useState<api.MarketConfig | null>(null);
  const [city, setCity] = useState<string | null>(null);
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
    setConfig(await loadMarketConfig(userCity));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { config, city, loading, refresh, outsideArea: config != null && !config.legacyOpen && !config.acceptingJobs };
}
