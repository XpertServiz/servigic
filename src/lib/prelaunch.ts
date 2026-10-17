import { prisma } from "@/lib/prisma";

// Pre-launch configuration. Admin > Settings wins; the environment variables (PRO_APP_LIVE, CUSTOMER_APP_LIVE,
// PRO_TESTER_GROUP_URL, PRO_TESTING_OPTIN_URL, CUSTOMER_PREREG_URL) are the fallback. A link that is empty stays empty,
// and anything that needs it stays hidden, so the site never shows a dead button.
export interface PrelaunchConfig {
  proAppLive: boolean;
  customerAppLive: boolean;
  proTesterGroupUrl: string | null;
  proTestingOptInUrl: string | null;
  customerPreregUrl: string | null;
  /** Play Store pages, used once an app is live (the same links as the in-app update screen). */
  proStoreUrl: string | null;
  customerStoreUrl: string | null;
  notifyEmail: string;
}

const clean = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return /^https?:\/\//i.test(t) ? t : null;
};
const flag = (v: string | undefined) => v === "true" || v === "1";

export async function getPrelaunchConfig(): Promise<PrelaunchConfig> {
  const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } }).catch(() => null);
  return {
    proAppLive: s?.proAppLive || flag(process.env.PRO_APP_LIVE),
    customerAppLive: s?.customerAppLive || flag(process.env.CUSTOMER_APP_LIVE),
    proTesterGroupUrl: clean(s?.proTesterGroupUrl) ?? clean(process.env.PRO_TESTER_GROUP_URL),
    proTestingOptInUrl: clean(s?.proTestingOptInUrl) ?? clean(process.env.PRO_TESTING_OPTIN_URL),
    customerPreregUrl: clean(s?.customerPreregUrl) ?? clean(process.env.CUSTOMER_PREREG_URL),
    proStoreUrl: clean(s?.storeUrlPro) ?? clean(process.env.PRO_PLAY_STORE_URL),
    customerStoreUrl: clean(s?.storeUrlCustomer),
    notifyEmail: (s?.signupNotifyEmail ?? process.env.SIGNUP_NOTIFY_EMAIL ?? "xpertserviz@gmail.com").trim(),
  };
}

export { KARACHI_AREAS, WAITLIST_TRADES, TRADE_LABELS, FORM_COUNTRIES } from "@/lib/prelaunchData";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomWaitlistCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `WL${s}`;
}
