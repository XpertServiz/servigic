// One-page status of everything that delivers alerts: Firebase secrets, WhatsApp, SMS, email. Prints no secrets.
//   node scripts/check-messaging-setup.mjs
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const env = {};
try {
  for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch {
  console.log(".env not found next to the project root");
}
const has = (k) => Boolean(env[k]);
const line = (ok, label, hint = "") => console.log(`${ok ? "OK   " : "TODO "} ${label}${!ok && hint ? `\n        -> ${hint}` : ""}`);

console.log("\n== Push notifications (Firebase) ==");
let secrets = "";
try {
  secrets = execFileSync("gh", ["secret", "list"], { encoding: "utf8" });
} catch {
  console.log("(could not list GitHub secrets - is the GitHub CLI logged in?)");
}
line(secrets.includes("GOOGLE_SERVICES_PRO_B64"), "GitHub secret GOOGLE_SERVICES_PRO_B64", "node scripts/set-firebase-secrets.mjs <pro file> <customer file>");
line(secrets.includes("GOOGLE_SERVICES_CUSTOMER_B64"), "GitHub secret GOOGLE_SERVICES_CUSTOMER_B64");
console.log("      (the FCM service-account key lives in Expo, which cannot be checked from here: expo.dev > project > Credentials > Android)");

console.log("\n== WhatsApp ==");
line(has("WHATSAPP_CLOUD_API_TOKEN"), "WHATSAPP_CLOUD_API_TOKEN", "permanent system-user token from Meta Business settings");
line(has("WHATSAPP_PHONE_NUMBER_ID"), "WHATSAPP_PHONE_NUMBER_ID", "WhatsApp > API Setup > Phone number ID");
line(has("WHATSAPP_BUSINESS_ACCOUNT_ID"), "WHATSAPP_BUSINESS_ACCOUNT_ID", "WhatsApp > API Setup > WhatsApp Business Account ID");
if (has("WHATSAPP_CLOUD_API_TOKEN")) {
  const get = (path) => fetch(`https://graph.facebook.com/v20.0/${path}`, { headers: { Authorization: `Bearer ${env.WHATSAPP_CLOUD_API_TOKEN}` } }).then((r) => r.json());
  if (has("WHATSAPP_PHONE_NUMBER_ID")) {
    const p = await get(`${env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,name_status`);
    line(!p.error, `phone number ${p.display_phone_number ?? ""} (${p.verified_name ?? "?"}, quality ${p.quality_rating ?? "?"}, name ${p.name_status ?? "?"})`, p.error?.message);
  }
  if (has("WHATSAPP_BUSINESS_ACCOUNT_ID")) {
    const t = await get(`${env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,language,category,status&limit=50`);
    if (t.error) line(false, "message templates", t.error.message);
    else for (const x of t.data ?? []) line(x.status === "APPROVED", `template ${x.name} [${x.language}] ${x.category}: ${x.status}`);
    if (!(t.data ?? []).length) line(false, "no templates yet", "node scripts/create-whatsapp-templates.mjs");
  }
}
line(env.WHATSAPP_TEMPLATES_ENABLED === "true", "WHATSAPP_TEMPLATES_ENABLED=true", "set it (here and on Vercel) once the templates are APPROVED");

console.log("\n== SMS (Twilio) ==");
line(has("TWILIO_ACCOUNT_SID") && has("TWILIO_AUTH_TOKEN"), "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN");
line(has("TWILIO_FROM_NUMBER"), "TWILIO_FROM_NUMBER", "a Twilio phone number (or sender ID) that can send to Pakistan; without it no SMS is sent");

console.log("\n== Email (Resend) ==");
line(has("RESEND_API_KEY") && has("RESEND_FROM_EMAIL"), "RESEND_API_KEY + RESEND_FROM_EMAIL");
console.log("");
