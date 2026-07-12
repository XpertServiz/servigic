// WhatsApp Cloud API (Meta) — Master Brief §8: primary channel for PK provider alerts.
// No-ops until WHATSAPP_CLOUD_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set.
export async function sendWhatsappChannel(input: { to: string; title: string; body: string }) {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[notify:whatsapp:noop] ${input.to} — ${input.title}`);
    return;
  }

  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to.replace(/[^\d+]/g, ""),
      type: "text",
      text: { body: `${input.title}\n${input.body}` },
    }),
  });
}
