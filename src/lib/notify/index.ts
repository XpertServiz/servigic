import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import { sendEmailChannel } from "./channels/email";
import { sendWhatsappChannel } from "./channels/whatsapp";
import { sendSmsChannel } from "./channels/sms";
import { sendExpoPushChannel } from "./channels/expoPush";
import { bilingual, localiseCurrency } from "./translate";
import { getMarkets, marketForCity } from "@/lib/marketConfig";
import { localeForCountry } from "@/i18n/locales";

export interface NotifyPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  /** Extra channels beyond the always-on in-app bell. "push" always fires
   * when the user has registered a mobile push token — cheap and no-ops
   * safely with zero tokens, so it isn't gated the way email/whatsapp/sms are. */
  channels?: Array<"email" | "whatsapp" | "sms">;
  /** Picks the mobile push sound/channel when it differs from `type` (e.g.
   * chat messages are stored as STATUS_UPDATE but should ping lightly). */
  pushChannelHint?: string;
  /** false = write the in-app notification only (quiet hours / paused pros). Default true. */
  push?: boolean;
  /** Extra fields merged into the push `data` (e.g. jobId so a tap can deep-link). */
  pushData?: Record<string, unknown>;
  /** Overrides for the email channel only (a richer text than the push body). */
  emailSubject?: string;
  emailBody?: string;
}

// Single entry point for every alert in the system (Master Brief §8: "All
// channels behind one notify(userId, event) service"). In-app is always
// written; external channels are config, not code — each adapter no-ops
// safely when its credentials aren't set yet.
export async function notify(payload: NotifyPayload) {
  const { userId, type, linkUrl, channels = [], pushChannelHint, push = true, pushData } = payload;
  let { title, body } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, phone: true, name: true, language: true, fcmTokens: true, managedByAdmin: true, city: true, role: true },
  });
  if (!user) return;

  // Local language first, English underneath (a pro in Jeddah reads Arabic then English, a customer in Karachi Urdu then
  // English), and amounts in the recipient's own currency. Staff and unknown messages stay as written.
  try {
    const market = user.city ? marketForCity(await getMarkets(), user.city) : null;
    if (user.role === "CUSTOMER" || user.role === "PROVIDER") {
      const language = user.language !== "en" ? user.language : localeForCountry(market?.countryCode ?? "PK");
      ({ title, body } = bilingual(title, body, language));
    }
    const currency = market?.currency ?? "PKR";
    title = localiseCurrency(title, currency);
    body = localiseCurrency(body, currency);
    if (payload.emailBody) payload.emailBody = localiseCurrency(payload.emailBody, currency);
  } catch {
    // a failure here must never stop the alert itself
  }

  await prisma.notification.create({
    data: { userId, type, title, body, linkUrl },
  });

  // A placeholder customer (job posted by an admin on their behalf) has not agreed to receive messages from
  // the app: the admin talks to them directly. Keep the in-app record, so it is there when they claim the account.
  if (user.managedByAdmin) return;

  await Promise.allSettled([
    push && user.fcmTokens.length > 0
      ? sendExpoPushChannel({ tokens: user.fcmTokens, title, body, language: user.language, data: { linkUrl, type: pushChannelHint ?? type, ...pushData } })
      : Promise.resolve(),
    channels.includes("email") && user.email
      ? sendEmailChannel({ to: user.email, subject: payload.emailSubject ?? title, body: payload.emailBody ?? body })
      : Promise.resolve(),
    channels.includes("whatsapp")
      ? sendWhatsappChannel({ to: user.phone, title, body })
      : Promise.resolve(),
    channels.includes("sms")
      ? sendSmsChannel({ to: user.phone, body: `${title}: ${body}` })
      : Promise.resolve(),
  ]);
}
