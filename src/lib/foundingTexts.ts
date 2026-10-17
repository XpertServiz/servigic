// Founding Pro notification wording by the pro's app language. Languages without a translation use English.
// {pct} and {date} are filled in by the caller; "12%" in the ending text is replaced by the pro's real standard rate.
type Texts = { founding_title: string; founding_body: string; ending_title: string; ending_body: string };

const EN: Texts = {
  founding_title: "You are a Founding Pro! 🎉",
  founding_body: "You pay only {pct}% commission until {date}. Complete jobs now to build your rating.",
  ending_title: "Your Founding Pro rate ends soon",
  ending_body: "From {date} your commission returns to the standard 12%. Thank you for growing with Servigic!",
};

const TEXTS: Record<string, Texts> = {
  en: EN,
  ur: {
    founding_title: "آپ فاؤنڈنگ پرو ہیں! 🎉",
    founding_body: "{date} تک آپ صرف {pct}% کمیشن دیں گے۔ ابھی جابز مکمل کریں اور اپنی ریٹنگ بنائیں۔",
    ending_title: "آپ کا فاؤنڈنگ پرو ریٹ جلد ختم ہو رہا ہے",
    ending_body: "{date} سے آپ کا کمیشن معمول کے 12% پر واپس آ جائے گا۔ سرویجک کے ساتھ آگے بڑھنے کا شکریہ!",
  },
  ar: {
    founding_title: "أنت محترف مؤسس! 🎉",
    founding_body: "تدفع عمولة {pct}% فقط حتى {date}. أنجز الطلبات الآن لبناء تقييمك.",
    ending_title: "سعر المحترف المؤسس ينتهي قريبًا",
    ending_body: "اعتبارًا من {date} تعود عمولتك إلى النسبة المعتادة 12%. شكرًا لنموّك مع سيرفيجك!",
  },
};

const DATE_LOCALE: Record<string, string> = { en: "en-GB", ur: "ur-PK", ar: "ar" };

export function foundingText(language: string | null | undefined, kind: keyof Texts, vars: { pct?: number; date: Date; standardPct?: number }): string {
  const lang = language && TEXTS[language] ? language : "en";
  const date = vars.date.toLocaleDateString(DATE_LOCALE[lang], { day: "numeric", month: "long", year: "numeric" });
  let s = TEXTS[lang][kind].replace("{date}", date).replace("{pct}", String(vars.pct ?? ""));
  if (vars.standardPct != null) s = s.replace("12%", `${vars.standardPct}%`);
  return s;
}
