// Copies chosen variables from your local .env to the Vercel project's PRODUCTION environment, without ever
// overwriting one that already exists and never touching local-only values (database, localhost URLs ...).
//
//   1. Create a token: https://vercel.com/account/tokens  (scope: Xpertserviz's projects)
//   2. Put it in .env as   VERCEL_TOKEN=...      (delete it again when done)
//   3. node scripts/push-vercel-env.mjs            shows what WOULD be added (nothing changes)
//      node scripts/push-vercel-env.mjs --apply    adds the missing ones
//   Then redeploy once (Vercel > Deployments > latest > Redeploy) so the new variables are picked up.
import fs from "node:fs";

const env = {};
for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const TOKEN = env.VERCEL_TOKEN;
const PROJECT = "servigic";
const TEAM_SLUG = "xpertserviz-s-projects";
const apply = process.argv.includes("--apply");

// Only the values that deliver alerts and run the scheduled jobs. Everything else in .env is local (or already set).
const WANTED = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "WHATSAPP_CLOUD_API_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_TEMPLATES_ENABLED",
  "CRON_SECRET",
];

if (!TOKEN) {
  console.error("No VERCEL_TOKEN in .env. Create one at https://vercel.com/account/tokens and add it to .env as VERCEL_TOKEN=...");
  process.exit(1);
}
const api = async (path, init = {}) => {
  const res = await fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}slug=${TEAM_SLUG}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
};

const existing = await api(`/v9/projects/${PROJECT}/env`);
if (!existing.ok) {
  console.error("Could not read the project's variables:", existing.json?.error?.message ?? existing.status, "- is the token for the right account and project?");
  process.exit(1);
}
const have = new Set((existing.json.envs ?? []).filter((e) => (e.target ?? []).includes("production")).map((e) => e.key));
console.log(`Vercel project "${PROJECT}" already has ${have.size} production variables.\n`);

for (const key of WANTED) {
  const value = env[key];
  if (have.has(key)) console.log(`skip     ${key} (already on Vercel, not overwritten)`);
  else if (!value) console.log(`skip     ${key} (empty in .env)`);
  else if (!apply) console.log(`would add ${key}`);
  else {
    const r = await api(`/v10/projects/${PROJECT}/env`, { method: "POST", body: JSON.stringify({ key, value, type: "sensitive", target: ["production"] }) });
    console.log(r.ok ? `added    ${key}` : `FAILED   ${key}: ${r.json?.error?.message ?? r.status}`);
  }
}
console.log(apply ? "\nDone. Redeploy once so the new variables take effect, then delete VERCEL_TOKEN from .env." : "\n(dry run) re-run with --apply to add them.");
