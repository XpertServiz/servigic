// WhatsApp Cloud API (Meta) — Master Brief §8: primary channel for PK provider alerts.
// No-ops until WHATSAPP_CLOUD_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set.
//
// WhatsApp only lets a business send FREE-FORM text inside 24 hours after the person last wrote to it. Anything
// else (a job alert to a pro who never messaged us, an OTP) must be an approved TEMPLATE. Callers pass `template`;
// it is used when WHATSAPP_TEMPLATES_ENABLED=true (set it once the templates are approved, see
// scripts/create-whatsapp-templates.mjs). Otherwise the plain-text path below is used, as before.
export interface WhatsappTemplate {
  /** Environment variable that holds the approved template's name (so names live in config, not code). */
  nameEnv: string;
  defaultName: string;
  language?: string;
  /** {{1}}, {{2}}... of the template body, in order. */
  bodyParams: string[];
  /** Dynamic part of a URL button ("https://www.servigic.com/pro/jobs/{{1}}"), or the code for an OTP copy-code button. */
  buttonParam?: string;
  /** "url" for a dynamic-URL button, "otp" for an authentication template's copy-code button. */
  buttonKind?: "url" | "otp";
}

// Template parameters may not contain new lines, tabs or runs of 4+ spaces.
const clean = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 600);

export async function sendWhatsappChannel(input: { to: string; title: string; body: string; template?: WhatsappTemplate }) {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[notify:whatsapp:noop] ${input.to} — ${input.title}`);
    return;
  }

  const to = input.to.replace(/[^\d]/g, "");
  const useTemplate = input.template && process.env.WHATSAPP_TEMPLATES_ENABLED === "true";

  const payload = useTemplate
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: process.env[input.template!.nameEnv] || input.template!.defaultName,
          language: { code: input.template!.language ?? process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [
            ...(input.template!.bodyParams.length ? [{ type: "body", parameters: input.template!.bodyParams.map((t) => ({ type: "text", text: clean(t) })) }] : []),
            ...(input.template!.buttonParam
              ? [{ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: clean(input.template!.buttonParam!) }] }]
              : []),
          ],
        },
      }
    : { messaging_product: "whatsapp", to, type: "text", text: { body: `${input.title}\n${input.body}` } };

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error(`[notify:whatsapp:error] ${res.status} — ${(await res.text()).slice(0, 300)}`);
}
