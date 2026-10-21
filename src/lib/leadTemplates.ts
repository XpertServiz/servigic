// One-to-one WhatsApp message templates for the admin to send by hand (the system never sends in bulk). Every
// first message says who we are and how to stop. Placeholders: {name} {trade} {area} {join_link}.
export const TEMPLATE_LANGS = [
  { code: "rur", label: "Roman Urdu" },
  { code: "ur", label: "Urdu" },
  { code: "en", label: "English" },
] as const;
export type TemplateLang = (typeof TEMPLATE_LANGS)[number]["code"];

export const LEAD_TEMPLATES: Record<TemplateLang, string> = {
  rur: "Assalam o Alaikum {name}, main Servigic se baat kar raha hoon (ghar ki services ki app, {area} mein launch ho rahi hai). Hum achay {trade} dhoond rahe hain. Free register karne ke liye yahan click karein: {join_link}. Agar aap hamare messages nahi chahtay to STOP likh dein.",
  ur: "السلام علیکم {name}، میں سرویجک سے بات کر رہا ہوں (گھریلو خدمات کی ایپ جو {area} میں شروع ہو رہی ہے)۔ ہم اچھے {trade} تلاش کر رہے ہیں۔ مفت رجسٹر کرنے کے لیے یہاں کلک کریں: {join_link}۔ اگر آپ ہمارے پیغامات نہیں چاہتے تو STOP لکھ دیں۔",
  en: "Assalam o Alaikum {name}, this is Servigic, a home-services app launching in {area}. We are looking for good {trade} professionals. You can register free here: {join_link}. Reply STOP if you don't want messages from us.",
};

export function fillTemplate(lang: TemplateLang, v: { name?: string | null; trade?: string | null; area?: string | null; joinLink: string }): string {
  const first = (v.name ?? "").trim().split(/\s+/)[0] ?? "";
  return LEAD_TEMPLATES[lang]
    .replace("{name}", first || (lang === "ur" ? "جناب" : "bhai"))
    .replace("{trade}", v.trade || (lang === "ur" ? "کاریگر" : "tradesmen"))
    .replace("{area}", v.area || "Karachi")
    .replace("{join_link}", v.joinLink);
}

/** wa.me link that only pre-fills the message; the admin presses send. */
export function whatsappLink(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}

export function joinLink(origin: string, refCode: string | null | undefined): string {
  return `${origin}/join?role=pro${refCode ? `&ref=${refCode}` : ""}`;
}
