// Expo Push Notification service — works out of the box for any Expo app
// (dev client, EAS build, or Expo Go) with zero FCM/APNs setup required for
// development; production EAS builds get real credentials automatically.
// Android notification channel per alert type — each channel is created by
// the mobile apps at startup with its own importance + synthesized sound
// (see mobile/apps/*/src/lib/notifications.ts). Channel ids are versioned
// ("-v2") because Android fixes a channel's sound at creation.
const CHANNEL_BY_TYPE: Record<string, string> = {
  DISPATCH_ALERT: "new-job-alert-v2",
  BID_ACCEPTED: "bid-accepted-v2",
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
  DISPATCH_ALERT: "new_job_alert.wav",
  BID_ACCEPTED: "bid_accepted.wav",
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
}) {
  const type = typeof input.data?.type === "string" ? input.data.type : "";
  const channelId = CHANNEL_BY_TYPE[type] ?? DEFAULT_CHANNEL;
  const sound = SOUND_BY_TYPE[type] ?? "job_status_update.wav";
  const messages = input.tokens
    .filter((t) => t.startsWith("ExponentPushToken"))
    .map((to) => ({
      to,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      priority: "high",
      channelId,
      sound,
    }));

  if (messages.length === 0) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
}
