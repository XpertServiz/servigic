// Expo Push Notification service — works out of the box for any Expo app
// (dev client, EAS build, or Expo Go) with zero FCM/APNs setup required for
// development; production EAS builds get real credentials automatically.
// Android notification channel per alert type — each channel is created by
// the mobile apps at startup with its own importance + synthesized sound
// (see mobile/apps/*/src/lib/notifications.ts). Channel ids are versioned
// ("-v2") because Android fixes a channel's sound at creation.
// Spoken alerts (voice kit): one channel per event per language, "<event>_<lang>", created by the apps. A language
// without recordings falls back to English (the app languages are en, ur, ar, de, fr, pl, es, hi).
import { prisma } from "@/lib/prisma";

const VOICE_LANGS = new Set(["en", "ur", "ar", "hi", "fr", "de", "es", "pa"]);
const VOICE_EVENT_BY_TYPE: Record<string, string> = {
  DISPATCH_ALERT: "new_job",
  BID_ACCEPTED: "bid_accepted",
  JOB_CANCELLED: "job_cancelled",
  BID_FIRST: "first_bid",
  PRO_ON_THE_WAY: "pro_on_the_way",
  PRO_ARRIVED: "pro_arrived",
};

const CHANNEL_BY_TYPE: Record<string, string> = {
  // Later bids on the same job update quietly (the first bid rings, see VOICE_EVENT_BY_TYPE).
  BID_MORE: "bid-update-v1",
  PAYMENT_VERIFIED: "payment-added-v2",
  PAYOUT_SENT: "payment-added-v2",
  JOB_COMPLETED: "job-done-v2",
  STATUS_UPDATE: "job-status-update-v2",
  MESSAGE: "message-received-v2",
};
const DEFAULT_CHANNEL = "job-status-update-v2";

// iOS has no channels: the sound travels with the push. The files are bundled in the
// apps (expo-notifications "sounds" in app.json), so the names must match.
const SOUND_BY_TYPE: Record<string, string> = {
  PAYMENT_VERIFIED: "payment_added.wav",
  PAYOUT_SENT: "payment_added.wav",
  JOB_COMPLETED: "job_done.wav",
  STATUS_UPDATE: "job_status_update.wav",
  MESSAGE: "message_received.wav",
};

export async function sendExpoPushChannel(input: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** The user's app language, which picks the voice channel. */
  language?: string | null;
}) {
  const type = typeof input.data?.type === "string" ? input.data.type : "";
  const voiceEvent = VOICE_EVENT_BY_TYPE[type];
  const lang = input.language && VOICE_LANGS.has(input.language) ? input.language : "en";
  const channelId = voiceEvent ? `${voiceEvent}_${lang}` : (CHANNEL_BY_TYPE[type] ?? DEFAULT_CHANNEL);
  // Voice alerts: the recording is the CHANNEL's sound (Android). iOS cannot play .ogg, so it gets its default sound.
  const sound = voiceEvent ? "default" : (SOUND_BY_TYPE[type] ?? "job_status_update.wav");
  const messages = input.tokens
    .filter((t) => t.startsWith("ExponentPushToken"))
    .map((to) => ({
      to,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      // FCM high priority: delivered immediately even in Doze / with the screen off.
      priority: "high",
      channelId,
      // Android plays the CHANNEL's sound (the app plays no audio of its own); iOS needs it on the push.
      sound: type === "BID_MORE" ? null : sound,
      ttl: type === "DISPATCH_ALERT" ? 3600 : 86400,
    }));

  if (messages.length === 0) return;

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  // Tokens of apps that were uninstalled (or reinstalled with a new token) are removed, so they do not hide real failures.
  const tickets = ((await res.json().catch(() => null)) as { data?: { status: string; message?: string; details?: { error?: string } }[] } | null)?.data ?? [];
  const dead: string[] = [];
  tickets.forEach((ticket, i) => {
    if (ticket.status !== "error") return;
    if (ticket.details?.error === "DeviceNotRegistered") dead.push(messages[i].to);
    else console.error("[push]", type, ticket.details?.error ?? "", ticket.message ?? "");
  });
  if (dead.length > 0) {
    const users = await prisma.user.findMany({ where: { fcmTokens: { hasSome: dead } }, select: { id: true, fcmTokens: true } });
    await Promise.all(users.map((u) => prisma.user.update({ where: { id: u.id }, data: { fcmTokens: u.fcmTokens.filter((t) => !dead.includes(t)) } })));
  }
}
