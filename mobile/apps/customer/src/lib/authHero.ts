// The picture behind the sign-in / sign-up screens: ONE photo of the best-known place of the user's country (Karachi gets the
// Quaid-e-Azam Mausoleum, the rest of Pakistan the Faisal Mosque). No slideshow. The photos are small static files on the website
// (public/auth-heroes, served by the CDN); Pakistan's two are also bundled in the app so the first launch works offline.
// Which one: the phone-number country on screen (so picking +966 shows Madinah at once); for Pakistan the server's IP city decides.
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import * as api from "./api";
import { isLangCode, type LangCode } from "./i18n/languages";

const BUNDLED: Record<string, ImageSourcePropType> = {
  "PK-karachi": require("../../assets/auth/hero/PK-karachi.webp"),
  PK: require("../../assets/auth/hero/PK.webp"),
};
const REMOTE = ["SA", "US", "CA"]; // keep in step with src/lib/authHero.ts on the website

let serverHero: string | null | undefined; // undefined = not asked yet
let asking: Promise<void> | null = null;
function ask(): Promise<void> {
  if (!asking) {
    asking = api
      .getMarket()
      .then((m) => {
        serverHero = m.hero ?? null;
      })
      .catch(() => {
        serverHero = null;
      });
  }
  return asking;
}

/** The two languages the chip shows for a country: its own (when the app has it) and English. */
const LOCAL_LANG: Record<string, string> = {
  PK: "ur", SA: "ar", AE: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar", EG: "ar", JO: "ar", IQ: "ar", MA: "ar",
  DE: "de", AT: "de", CH: "de", FR: "fr", ES: "es", MX: "es", PL: "pl", IN: "hi",
};
export function chipLanguages(country: string): LangCode[] {
  const local = LOCAL_LANG[country.toUpperCase()];
  return local && isLangCode(local) && local !== "en" ? [local, "en"] : ["en"];
}

export function useAuthHero(country: string): ImageSourcePropType | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (serverHero !== undefined) return;
    let live = true;
    ask().then(() => live && force((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);
  const cc = country.toUpperCase();
  if (cc === "PK") {
    const key = serverHero && serverHero.startsWith("PK") ? serverHero : "PK-karachi"; // launch city until the server answers
    return BUNDLED[key] ?? BUNDLED["PK-karachi"];
  }
  if (REMOTE.includes(cc)) return { uri: `${api.getApiBaseUrl()}/auth-heroes/${cc}.webp` };
  return null;
}
