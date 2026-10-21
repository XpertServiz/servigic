// What changes from one country to the next on the website and in the apps: which cities we name, which ID document is
// checked, how pros are paid, and so on. The website texts carry %%tokens%% (see messages/*.json); tokensFor() fills them in
// for the visitor's country and language, so a Saudi visitor reads "Iqama / Saudi ID" and "Jeddah and Madinah" and a
// Pakistani one reads "CNIC" and "Karachi, Lahore and Islamabad". Pure data and functions: safe on server and client.

export type L = string; // locale code ("en", "ar", ...)
type Texts = Partial<Record<L, string>> & { en: string };

const pick = (t: Texts, locale: L) => t[locale] ?? t.en;

// ---------- small word lists, in each of the 12 website languages ----------
const WORDS = {
  and: { en: "and", ur: "اور", ar: "و", de: "und", fr: "et", es: "y", hi: "और", it: "e", nl: "en", pl: "i", pt: "e", tr: "ve" },
  or: { en: "or", ur: "یا", ar: "أو", de: "oder", fr: "ou", es: "o", hi: "या", it: "o", nl: "of", pl: "lub", pt: "ou", tr: "veya" },
  cash: { en: "cash", ur: "نقد", ar: "نقداً", de: "bar", fr: "espèces", es: "efectivo", hi: "नक़द", it: "contanti", nl: "contant", pl: "gotówką", pt: "dinheiro", tr: "nakit" },
  bankTransfer: { en: "bank transfer", ur: "بینک ٹرانسفر", ar: "تحويل بنكي", de: "Banküberweisung", fr: "virement", es: "transferencia", hi: "बैंक ट्रांसफ़र", it: "bonifico", nl: "bankoverschrijving", pl: "przelewem", pt: "transferência", tr: "banka havalesi" },
  bank: { en: "bank", ur: "بینک", ar: "البنك", de: "Bank", fr: "banque", es: "banco", hi: "बैंक", it: "banca", nl: "bank", pl: "konto bankowe", pt: "banco", tr: "banka" },
  wallet: { en: "mobile wallet", ur: "موبائل والیٹ", ar: "محفظة إلكترونية", de: "Mobile Wallet", fr: "portefeuille mobile", es: "monedero móvil", hi: "मोबाइल वॉलेट", it: "portafoglio mobile", nl: "mobiele wallet", pl: "portfel mobilny", pt: "carteira móvel", tr: "mobil cüzdan" },
  soon: { en: "more cities coming soon", ur: "مزید شہر جلد آ رہے ہیں", ar: "مدن أخرى قريباً", de: "weitere Städte folgen bald", fr: "d’autres villes bientôt", es: "más ciudades pronto", hi: "जल्द ही और शहर", it: "altre città in arrivo", nl: "binnenkort meer steden", pl: "wkrótce kolejne miasta", pt: "mais cidades em breve", tr: "yakında daha fazla şehir" },
  trusted: { en: "Trusted by homeowners across %s", ur: "%s کے گھر مالکان کا اعتماد", ar: "موثوق من أصحاب المنازل في %s", de: "Vertraut von Hausbesitzern in %s", fr: "La confiance des propriétaires à %s", es: "La confianza de propietarios en %s", hi: "%s के घर-मालिकों का भरोसा", it: "La scelta dei proprietari di casa a %s", nl: "Vertrouwd door huiseigenaren in %s", pl: "Zaufali nam właściciele domów w: %s", pt: "A confiança de proprietários em %s", tr: "%s genelinde ev sahiplerinin güvendiği platform" },
  opening: { en: "Opening soon in %s", ur: "جلد %s میں شروع ہو رہا ہے", ar: "قريباً في %s", de: "Bald verfügbar in %s", fr: "Bientôt disponible à %s", es: "Próximamente en %s", hi: "जल्द ही %s में", it: "Presto a %s", nl: "Binnenkort in %s", pl: "Wkrótce w: %s", pt: "Em breve em %s", tr: "Yakında %s şehrinde" },
} satisfies Record<string, Texts>;

// ---------- city names (English, Arabic, Urdu; other languages use the English spelling) ----------
const CITY: Record<string, Partial<Record<L, string>>> = {
  Karachi: { ar: "كراتشي", ur: "کراچی", de: "Karatschi", pl: "Karaczi" },
  Lahore: { ar: "لاهور", ur: "لاہور", pl: "Lahaur" },
  Islamabad: { ar: "إسلام آباد", ur: "اسلام آباد" },
  Rawalpindi: { ar: "راولبندي", ur: "راولپنڈی" },
  Jeddah: { ar: "جدة", ur: "جدہ" },
  Madinah: { ar: "المدينة المنورة", ur: "مدینہ منورہ", en: "Madinah" },
  Riyadh: { ar: "الرياض", ur: "ریاض" },
  Dubai: { ar: "دبي", ur: "دبئی" },
  "Abu Dhabi": { ar: "أبوظبي", ur: "ابوظہبی" },
  Sharjah: { ar: "الشارقة", ur: "شارجہ" },
  Doha: { ar: "الدوحة", ur: "دوحہ" },
  Toronto: { ar: "تورونتو", ur: "ٹورنٹو" },
  Vancouver: { ar: "فانكوفر", ur: "وینکوور" },
  Montreal: { ar: "مونتريال", ur: "مونٹریال" },
  "New York": { ar: "نيويورك", ur: "نیویارک", de: "New York" },
  Berlin: { ar: "برلين", ur: "برلن" },
  Munich: { ar: "ميونخ", de: "München", ur: "میونخ" },
  Warsaw: { ar: "وارسو", ur: "وارسا", pl: "Warszawie" },
};
export const cityName = (city: string, locale: L) => CITY[city]?.[locale] ?? city;

// ---------- the profiles ----------
export interface CountryProfile {
  code: string;
  /** Cities named on the page when the market config does not say (the live list from Countries & Localization wins). */
  cities: string[];
  idDoc: Texts; // the ID document checked at sign-up
  policeDoc: Texts; // the police / background document of Level 2
  payoutKeys: string[]; // how pros are paid ("straight to ...")
  payKeys: string[]; // how customers pay the pro directly
  /** A neighbourhood used in the demo job on the home page ("AC not cooling in ..."). */
  sampleArea: Texts;
  /** Example phone number shown in the sign-up form (international format). */
  phoneExample: string;
  /** Default language when only the country is known (crawlers, first visit). */
  language: L;
}

const GENERIC_ID: Texts = { en: "government photo ID", ur: "سرکاری شناختی دستاویز", ar: "هوية حكومية مصوّرة", de: "amtlicher Lichtbildausweis", fr: "pièce d’identité officielle", es: "documento de identidad oficial" };

export const PROFILES: Record<string, CountryProfile> = {
  PK: {
    code: "PK", cities: ["Karachi", "Lahore", "Islamabad"], language: "ur", phoneExample: "+92 300 1234567", sampleArea: { en: "Gulshan-e-Iqbal", ur: "گلشنِ اقبال", ar: "جلشن إقبال" },
    idDoc: { en: "CNIC", ur: "شناختی کارڈ (CNIC)", ar: "بطاقة الهوية الباكستانية (CNIC)" },
    policeDoc: { en: "police verification certificate", ur: "پولیس تصدیقی سرٹیفکیٹ", ar: "شهادة التحقق من الشرطة" },
    payoutKeys: ["EasyPaisa", "JazzCash", "bank"], payKeys: ["cash", "JazzCash", "EasyPaisa", "bankTransfer"],
  },
  SA: {
    code: "SA", cities: ["Jeddah", "Madinah", "Riyadh"], language: "ar", phoneExample: "+966 50 123 4567", sampleArea: { en: "Al Hamra, Jeddah", ar: "حي الحمراء، جدة", ur: "الحمراء، جدہ" },
    idDoc: { en: "Iqama or Saudi national ID", ur: "اقامہ یا سعودی قومی شناختی کارڈ", ar: "الإقامة أو الهوية الوطنية السعودية" },
    policeDoc: { en: "police clearance certificate", ur: "پولیس کلیئرنس سرٹیفکیٹ", ar: "شهادة عدم المحكومية (صحيفة الحالة الجنائية)" },
    payoutKeys: ["bank"], payKeys: ["cash", "bankTransfer", "wallet"],
  },
  AE: {
    code: "AE", cities: ["Dubai", "Abu Dhabi", "Sharjah"], language: "ar", phoneExample: "+971 50 123 4567", sampleArea: { en: "Dubai Marina", ar: "دبي مارينا" },
    idDoc: { en: "Emirates ID", ur: "ایمریٹس آئی ڈی", ar: "الهوية الإماراتية" },
    policeDoc: { en: "police clearance certificate", ar: "شهادة حسن سيرة وسلوك" },
    payoutKeys: ["bank"], payKeys: ["cash", "bankTransfer", "wallet"],
  },
  QA: {
    code: "QA", cities: ["Doha"], language: "ar", phoneExample: "+974 3312 3456", sampleArea: { en: "West Bay, Doha", ar: "الخليج الغربي، الدوحة" },
    idDoc: { en: "Qatar ID", ar: "بطاقة الهوية القطرية" },
    policeDoc: { en: "police clearance certificate", ar: "شهادة حسن سيرة وسلوك" },
    payoutKeys: ["bank"], payKeys: ["cash", "bankTransfer", "wallet"],
  },
  CA: {
    code: "CA", cities: ["Toronto", "Vancouver", "Montreal"], language: "en", phoneExample: "+1 416 555 0123", sampleArea: { en: "North York, Toronto" },
    idDoc: { en: "government photo ID (driver’s licence or passport)", fr: "pièce d’identité avec photo (permis de conduire ou passeport)" },
    policeDoc: { en: "criminal record check", fr: "vérification des antécédents judiciaires" },
    payoutKeys: ["bank"], payKeys: ["cash", "Interac e-Transfer", "bankTransfer"],
  },
  US: {
    code: "US", cities: ["New York"], language: "en", phoneExample: "+1 212 555 0123", sampleArea: { en: "Brooklyn, New York" },
    idDoc: { en: "government photo ID (driver’s license or state ID)", es: "identificación oficial con foto (licencia de conducir o ID estatal)" },
    policeDoc: { en: "background check", es: "verificación de antecedentes" },
    payoutKeys: ["bank"], payKeys: ["cash", "Zelle", "bankTransfer"],
  },
  DE: {
    code: "DE", cities: ["Berlin", "Munich"], language: "de", phoneExample: "+49 151 2345678", sampleArea: { en: "Prenzlauer Berg, Berlin" },
    idDoc: { en: "ID card or passport", de: "Personalausweis oder Reisepass" },
    policeDoc: { en: "police clearance certificate (Führungszeugnis)", de: "polizeiliches Führungszeugnis" },
    payoutKeys: ["bank"], payKeys: ["cash", "bankTransfer"],
  },
  PL: {
    code: "PL", cities: ["Warsaw"], language: "pl", phoneExample: "+48 512 345 678", sampleArea: { en: "Mokotów, Warszawa" },
    idDoc: { en: "ID card or passport", pl: "dowód osobisty lub paszport" },
    policeDoc: { en: "criminal record certificate", pl: "zaświadczenie o niekaralności" },
    payoutKeys: ["bank"], payKeys: ["cash", "bankTransfer"],
  },
};

export const FALLBACK_PROFILE: CountryProfile = {
  code: "XX", cities: [], language: "en", phoneExample: "+1 555 123 4567", sampleArea: { en: "Downtown" }, idDoc: GENERIC_ID, policeDoc: { en: "police clearance certificate" }, payoutKeys: ["bank"], payKeys: ["cash", "bankTransfer"],
};

export function profileFor(code: string | null | undefined): CountryProfile {
  return (code && PROFILES[code.toUpperCase()]) || FALLBACK_PROFILE;
}

/** Language a country is most likely to read when nothing else is known (a crawler, a first visit). */
export function defaultLocaleForCountry(code: string | null | undefined): L {
  return profileFor(code).language;
}

// ---------- tokens ----------
function listText(items: string[], locale: L, joiner: "and" | "or" = "and"): string {
  if (items.length <= 1) return items[0] ?? "";
  const word = pick(WORDS[joiner], locale);
  const sep = locale === "ar" || locale === "ur" ? "، " : ", ";
  return `${items.slice(0, -1).join(sep)} ${word} ${items[items.length - 1]}`;
}

function methodLabel(key: string, locale: L): string {
  const w = (WORDS as Record<string, Texts>)[key];
  return w ? pick(w, locale) : key;
}

export interface TokenInput {
  countryCode: string | null | undefined;
  locale: L;
  /** Display name of the country in `locale` (Intl.DisplayNames). */
  countryName: string;
  /** Cities that are live (Countries & Localization). Empty = use the profile's. */
  liveCities?: string[];
  /** True when the visitor's country is open for jobs. */
  isLive: boolean;
  /** Names (in `locale`) of every country that is live right now, for "launching first in ...". */
  liveCountryNames?: string[];
}

/** Every %%token%% the website texts can use, for one visitor. */
export function tokensFor(i: TokenInput): Record<string, string> {
  const p = profileFor(i.countryCode);
  const cityKeys = (i.liveCities?.length ? i.liveCities : p.cities).slice(0, 4);
  const cities = listText(cityKeys.map((c) => cityName(c, i.locale)), i.locale);
  const soon = pick(WORDS.soon, i.locale);
  const trusted = pick(i.isLive ? WORDS.trusted : WORDS.opening, i.locale).replace("%s", `${cities || i.countryName} (${soon})`);
  return {
    country: i.countryName,
    city1: cityKeys[0] ?? i.countryName,
    city2: cityKeys[1] ?? cityKeys[0] ?? i.countryName,
    city3: cityKeys[2] ?? cityKeys[1] ?? cityKeys[0] ?? i.countryName,
    launchCountries: listText(i.liveCountryNames?.length ? i.liveCountryNames : [i.countryName], i.locale),
    cities,
    citiesSoon: `${cities} (${soon})`,
    trustedLine: trusted,
    sampleArea: pick(p.sampleArea, i.locale),
    idDoc: pick(p.idDoc, i.locale),
    policeDoc: pick(p.policeDoc, i.locale),
    payList: listText(p.payKeys.map((k) => methodLabel(k, i.locale)), i.locale, "or"),
    payoutList: listText(p.payoutKeys.map((k) => methodLabel(k, i.locale)), i.locale, "or"),
    phoneExample: p.phoneExample,
  };
}

/** Replaces %%name%% in every string of a messages object (in place of the original; returns a new object). */
export function applyTokens<T>(messages: T, tokens: Record<string, string>): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.includes("%%") ? v.replace(/%%(\w+)%%/g, (m, k: string) => tokens[k] ?? m) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x);
      return out;
    }
    return v;
  };
  return walk(messages) as T;
}
