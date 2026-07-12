// Expo Push Notification service — works out of the box for any Expo app
// (dev client, EAS build, or Expo Go) with zero FCM/APNs setup required for
// development; production EAS builds get real credentials automatically.
export async function sendExpoPushChannel(input: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const messages = input.tokens
    .filter((t) => t.startsWith("ExponentPushToken"))
    .map((to) => ({
      to,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      priority: "high",
      channelId: "dispatch-alerts",
    }));

  if (messages.length === 0) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
}
