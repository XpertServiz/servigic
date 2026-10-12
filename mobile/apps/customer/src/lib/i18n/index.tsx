// Lightweight i18n for the mobile apps (redesign spec §6). Shared verbatim by
// apps/customer and apps/pro.
//
// - Every user-facing string lives in locales/<code>.ts — screens call t("key").
// - First launch only *suggests* a language (server geo-detection → device
//   locale → English); it never switches silently.
// - The chosen language is stored on the device AND on the user's account, so
//   it follows them across reinstalls/devices.
// - Urdu and Arabic are right-to-left; switching to/from them flips
//   I18nManager and reloads the JS bundle once (RN only applies RTL at start).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { I18nManager } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { getLocales } from "expo-localization";
import * as api from "../api";
import { DEFAULT_LANG, isLangCode, isRtlLang, type LangCode } from "./languages";
import { en, type TKey } from "./locales/en";
import { ur } from "./locales/ur";
import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { fr } from "./locales/fr";
import { pl } from "./locales/pl";
import { es } from "./locales/es";
import { hi } from "./locales/hi";

export type { LangCode } from "./languages";
export { LANGUAGES } from "./languages";
export type { TKey } from "./locales/en";

type Vars = Record<string, string | number>;
export type TFunction = (key: TKey, vars?: Vars) => string;
/** Dynamic lookup for keys built at runtime (enum labels). Returns null when the key has no string. */
export type TDynamic = (key: string) => string | null;

const TABLES: Record<LangCode, Partial<Record<TKey, string>>> = { en, ur, ar, de, fr, pl, es, hi };

const KEY_LANG = "servigic_lang";
const KEY_CHOSEN = "servigic_lang_chosen";
const KEY_PROMPTED = "servigic_lang_prompted";
const KEY_RTL_RELOAD = "servigic_rtl_reload_at";

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

function lookup(lang: LangCode, key: string): string | null {
  const table = TABLES[lang] as Record<string, string | undefined>;
  return table[key] ?? (en as Record<string, string>)[key] ?? null;
}

/** Translate into a specific language regardless of the active one (used by the language suggestion prompt). */
export function translateIn(lang: LangCode, key: TKey, vars?: Vars): string {
  return interpolate(lookup(lang, key) ?? key, vars);
}

async function store(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {}
}
async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

function deviceLanguage(): LangCode {
  try {
    const code = getLocales()[0]?.languageCode;
    if (isLangCode(code)) return code;
  } catch {}
  return DEFAULT_LANG;
}

// RN only reads the RTL flag at start-up, so a direction change needs a JS
// reload. Guarded against reload loops (e.g. dev clients where the reload
// can't change the flag): at most one attempt per 30 s.
async function applyDirection(lang: LangCode) {
  const wantRtl = isRtlLang(lang);
  if (I18nManager.isRTL === wantRtl) return;
  try {
    I18nManager.allowRTL(wantRtl);
    I18nManager.forceRTL(wantRtl);
  } catch {}
  const last = Number(await read(KEY_RTL_RELOAD)) || 0;
  if (Date.now() - last < 30000) return;
  await store(KEY_RTL_RELOAD, String(Date.now()));
  try {
    await Updates.reloadAsync();
  } catch (e) {
    console.warn("[i18n] reload for RTL change failed", e);
  }
}

interface I18nState {
  lang: LangCode;
  ready: boolean;
  t: TFunction;
  td: TDynamic;
  /** Language suggested for the user's country, if different from the active one and not yet answered. */
  suggestion: LangCode | null;
  suggestedForCountry: LangCode | null;
  countryName: string | null;
  /** ISO country code from the server's geo hint (also used to default the phone-country picker). */
  countryCode: string | null;
  setLanguage: (code: LangCode) => Promise<void>;
  dismissSuggestion: () => void;
  /** Call right after sign-in with the language stored on the account. */
  syncWithAccount: (accountLang: string | undefined | null) => Promise<void>;
}

const I18nContext = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);
  const [suggestion, setSuggestion] = useState<LangCode | null>(null);
  const [suggestedForCountry, setSuggestedForCountry] = useState<LangCode | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const loggedIn = useRef(false);
  const chosen = useRef(false);

  useEffect(() => {
    (async () => {
      const stored = await read(KEY_LANG);
      chosen.current = (await read(KEY_CHOSEN)) === "1";
      const initial = isLangCode(stored) ? stored : deviceLanguage();
      setLang(initial);
      setReady(true);
      applyDirection(initial);

      // Suggestion only: geo-detect on the server (no third-party IP lookup).
      try {
        const market = await api.getMarket();
        if (isLangCode(market.suggestedLocale)) {
          setSuggestedForCountry(market.suggestedLocale);
          setCountryName(market.countryName);
          setCountryCode(market.country);
          const prompted = (await read(KEY_PROMPTED)) === "1";
          if (!chosen.current && !prompted && market.suggestedLocale !== initial) setSuggestion(market.suggestedLocale);
        }
      } catch {
        // Offline / old backend: device locale already applied above.
      }
    })();
  }, []);

  const setLanguage = useCallback(async (code: LangCode) => {
    chosen.current = true;
    setLang(code);
    setSuggestion(null);
    await Promise.all([store(KEY_LANG, code), store(KEY_CHOSEN, "1"), store(KEY_PROMPTED, "1")]);
    if (loggedIn.current) api.updateMyLanguage(code).catch(() => {});
    applyDirection(code);
  }, []);

  const dismissSuggestion = useCallback(() => {
    setSuggestion(null);
    store(KEY_PROMPTED, "1");
  }, []);

  const syncWithAccount = useCallback(async (accountLang: string | undefined | null) => {
    loggedIn.current = true;
    if (chosen.current) {
      // The device holds an explicit choice → it wins and is saved to the account.
      const current = (await read(KEY_LANG)) as LangCode | null;
      if (current && isLangCode(current) && current !== accountLang) api.updateMyLanguage(current).catch(() => {});
      return;
    }
    // No explicit choice on this device (e.g. fresh reinstall): adopt the account's.
    // "en" is the column default, so only a non-English value counts as a real preference.
    if (isLangCode(accountLang) && accountLang !== DEFAULT_LANG) {
      setLang(accountLang);
      await Promise.all([store(KEY_LANG, accountLang), store(KEY_CHOSEN, "1")]);
      chosen.current = true;
      setSuggestion(null);
      applyDirection(accountLang);
    }
  }, []);

  const value = useMemo<I18nState>(
    () => ({
      lang,
      ready,
      t: (key, vars) => interpolate(lookup(lang, key) ?? key, vars),
      td: (key) => lookup(lang, key),
      suggestion,
      suggestedForCountry,
      countryName,
      countryCode,
      setLanguage,
      dismissSuggestion,
      syncWithAccount,
    }),
    [lang, ready, suggestion, suggestedForCountry, countryName, countryCode, setLanguage, dismissSuggestion, syncWithAccount]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Shorthand for components that only need t(). */
export function useT(): TFunction {
  return useI18n().t;
}
