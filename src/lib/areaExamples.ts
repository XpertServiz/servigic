// A well-known neighbourhood of each city, shown as the example in "Area" fields ("e.g. Quba" in Madinah, "e.g. Al Aziziyah"
// in Jeddah, "e.g. Gulshan-e-Iqbal" in Karachi), in the reader's language where the name is written differently. The same table
// is in the apps (mobile/apps/pro/src/lib/areaExamples.ts); keep them in step.

type Names = { en: string; ar?: string; ur?: string; hi?: string };

const AREAS: Record<string, Names> = {
  // Pakistan
  karachi: { en: "Gulshan-e-Iqbal", ur: "گلشنِ اقبال", ar: "غولشان إقبال" },
  lahore: { en: "Gulberg", ur: "گلبرگ", ar: "غولبرغ" },
  islamabad: { en: "F-7 Markaz", ur: "ایف سیون مرکز" },
  rawalpindi: { en: "Saddar", ur: "صدر" },
  faisalabad: { en: "Madina Town", ur: "مدینہ ٹاؤن" },
  multan: { en: "Gulgasht Colony", ur: "گلگشت کالونی" },
  peshawar: { en: "Hayatabad", ur: "حیات آباد" },
  // Saudi Arabia
  madinah: { en: "Quba", ar: "قباء", ur: "قباء" },
  medina: { en: "Quba", ar: "قباء", ur: "قباء" },
  jeddah: { en: "Al Aziziyah", ar: "العزيزية", ur: "العزیزیہ" },
  riyadh: { en: "Al Olaya", ar: "العليا", ur: "العلیا" },
  makkah: { en: "Al Aziziyah", ar: "العزيزية", ur: "العزیزیہ" },
  mecca: { en: "Al Aziziyah", ar: "العزيزية", ur: "العزیزیہ" },
  dammam: { en: "Al Faisaliyah", ar: "الفيصلية", ur: "الفیصلیہ" },
  khobar: { en: "Al Aqrabiyah", ar: "العقربية" },
  "al khobar": { en: "Al Aqrabiyah", ar: "العقربية" },
  taif: { en: "Al Faisaliyah", ar: "الفيصلية" },
  // UAE, Qatar
  dubai: { en: "Al Barsha", ar: "البرشاء", ur: "البرشاء" },
  "abu dhabi": { en: "Khalifa City", ar: "مدينة خليفة" },
  sharjah: { en: "Al Nahda", ar: "النهدة" },
  ajman: { en: "Al Nuaimiya", ar: "النعيمية" },
  doha: { en: "Al Sadd", ar: "السد" },
  "al rayyan": { en: "Muaither", ar: "معيذر" },
  "al wakrah": { en: "Al Wukair", ar: "الوكير" },
  // Canada, USA
  toronto: { en: "Scarborough" },
  vancouver: { en: "Kitsilano" },
  montreal: { en: "Plateau-Mont-Royal" },
  calgary: { en: "Beltline" },
  ottawa: { en: "Kanata" },
  mississauga: { en: "Port Credit" },
  "new york": { en: "Brooklyn" },
  "los angeles": { en: "Silver Lake" },
  chicago: { en: "Lincoln Park" },
  houston: { en: "The Heights" },
  // Germany, Poland
  berlin: { en: "Prenzlauer Berg" },
  munich: { en: "Schwabing" },
  hamburg: { en: "Altona" },
  frankfurt: { en: "Sachsenhausen" },
  cologne: { en: "Ehrenfeld" },
  warsaw: { en: "Mokotów" },
  kraków: { en: "Kazimierz" },
  krakow: { en: "Kazimierz" },
  gdańsk: { en: "Wrzeszcz" },
  gdansk: { en: "Wrzeszcz" },
  wrocław: { en: "Krzyki" },
  wroclaw: { en: "Krzyki" },
};

// When the city is not known yet: a neighbourhood of the country's first launch city.
const COUNTRY: Record<string, string> = { PK: "karachi", SA: "jeddah", AE: "dubai", QA: "doha", CA: "toronto", US: "new york", DE: "berlin", PL: "warsaw" };

/** A neighbourhood of `city` (or of `country`) in `lang`, or null when we have none. */
export function areaExample(city: string | null | undefined, lang: string, country?: string | null): string | null {
  const names = (city && AREAS[city.trim().toLowerCase()]) || (country && AREAS[COUNTRY[country.toUpperCase()] ?? ""]) || null;
  if (!names) return null;
  return (names as Record<string, string | undefined>)[lang] ?? names.en;
}
