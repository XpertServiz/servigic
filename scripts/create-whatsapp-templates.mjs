// Submits Servigic's WhatsApp message templates to Meta for approval, so you do not have to type them into
// WhatsApp Manager. Needs WHATSAPP_CLOUD_API_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in .env.
//
//   node scripts/create-whatsapp-templates.mjs --dry-run   show what would be sent
//   node scripts/create-whatsapp-templates.mjs             submit (templates that already exist are skipped)
//
// Approval usually takes minutes to a day. Check with:  node scripts/check-messaging-setup.mjs
// When they show APPROVED, add WHATSAPP_TEMPLATES_ENABLED=true to .env and to Vercel.
import fs from "node:fs";

const env = {};
for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const dry = process.argv.includes("--dry-run");
const token = env.WHATSAPP_CLOUD_API_TOKEN;
const waba = env.WHATSAPP_BUSINESS_ACCOUNT_ID;

const SITE = "https://www.servigic.com";
const TEMPLATES = [
  {
    name: "new_job_alert",
    language: "en",
    category: "UTILITY", // a transactional notice - keep it free of promotional wording or Meta re-classes it as Marketing
    components: [
      { type: "BODY", text: "New job alert: {{1}}. {{2}}. Open Servigic Pro to see the details and place your bid.", example: { body_text: [["Plumber job - Today", "Gulshan-e-Iqbal - Leaking kitchen tap"]] } },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "View job", url: `${SITE}/pro/jobs/{{1}}`, example: [`${SITE}/pro/jobs/cm1abc23`] }] },
    ],
  },
  {
    name: "new_job_alert",
    language: "ur",
    category: "UTILITY",
    components: [
      { type: "BODY", text: "نئے کام کا الرٹ: {{1}}۔ {{2}}۔ تفصیل دیکھنے اور بولی لگانے کے لیے Servigic Pro کھولیں۔", example: { body_text: [["Plumber job - Today", "Gulshan-e-Iqbal - Leaking kitchen tap"]] } },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "کام دیکھیں", url: `${SITE}/pro/jobs/{{1}}`, example: [`${SITE}/pro/jobs/cm1abc23`] }] },
    ],
  },
  {
    name: "servigic_otp",
    language: "en",
    category: "AUTHENTICATION",
    components: [
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: 10 },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy code" }] },
    ],
  },
];

if (dry) {
  console.log(JSON.stringify(TEMPLATES, null, 2));
  console.log(`\n(dry run) ${TEMPLATES.length} templates, nothing sent.`);
  process.exit(0);
}
if (!token || !waba) {
  console.error("Missing WHATSAPP_CLOUD_API_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID in .env - see the setup steps (Meta business account first).");
  process.exit(1);
}

const api = (path, init) => fetch(`https://graph.facebook.com/v20.0/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }).then(async (r) => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) }));

const existing = await api(`${waba}/message_templates?fields=name,language,status&limit=100`);
if (!existing.ok) {
  console.error("Could not read templates:", existing.json?.error?.message ?? existing.status);
  process.exit(1);
}
const have = new Set((existing.json.data ?? []).map((t) => `${t.name}:${t.language}`));
for (const t of TEMPLATES) {
  const key = `${t.name}:${t.language}`;
  if (have.has(key)) {
    console.log(`skip   ${key} (already exists)`);
    continue;
  }
  const res = await api(`${waba}/message_templates`, { method: "POST", body: JSON.stringify(t) });
  console.log(res.ok ? `sent   ${key} -> ${res.json.status ?? "PENDING"} (${res.json.category ?? t.category})` : `FAILED ${key}: ${res.json?.error?.error_user_msg ?? res.json?.error?.message ?? res.status}`);
}
