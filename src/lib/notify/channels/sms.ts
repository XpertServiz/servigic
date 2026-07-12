// Local Pakistan SMS gateway fallback (Master Brief §8). Generic HTTP POST —
// swap the URL/payload shape for the specific gateway once one is contracted.
export async function sendSmsChannel(input: { to: string; body: string }) {
  const apiKey = process.env.SMS_GATEWAY_API_KEY;
  const senderId = process.env.SMS_GATEWAY_SENDER_ID || "Servigic";

  if (!apiKey) {
    console.log(`[notify:sms:noop] ${input.to} — ${input.body}`);
    return;
  }

  await fetch("https://api.sms-gateway.example/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: input.to, from: senderId, text: input.body }),
  });
}
