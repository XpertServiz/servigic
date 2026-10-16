// Uploads the two Firebase google-services.json files to GitHub as repository secrets, so the app builds can
// include push notifications. Needs the GitHub CLI logged in (`gh auth status`).
//
//   node scripts/set-firebase-secrets.mjs "C:\path\pro-google-services.json" "C:\path\customer-google-services.json"
//   add --dry-run to only check the files
//
// Each file must belong to the right Android package (com.servigic.pro / com.servigic.customer); this checks that.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const [proPath, customerPath] = args.filter((a) => !a.startsWith("--"));
if (!proPath || !customerPath) {
  console.error('Usage: node scripts/set-firebase-secrets.mjs "<pro google-services.json>" "<customer google-services.json>" [--dry-run]');
  process.exit(1);
}

function load(path, expectedPackage) {
  const raw = fs.readFileSync(path, "utf8");
  const json = JSON.parse(raw);
  const packages = (json.client ?? []).map((c) => c.client_info?.android_client_info?.package_name);
  if (!packages.includes(expectedPackage)) {
    throw new Error(`${path} is for ${packages.join(", ") || "no Android app"}, expected ${expectedPackage}. Download the right file from Firebase (Project settings > Your apps).`);
  }
  if (json.private_key || json.type === "service_account") throw new Error(`${path} is a service-account key, not google-services.json. Do not put that in GitHub; it goes to Expo.`);
  return Buffer.from(raw, "utf8").toString("base64");
}

const secrets = [
  ["GOOGLE_SERVICES_PRO_B64", load(proPath, "com.servigic.pro")],
  ["GOOGLE_SERVICES_CUSTOMER_B64", load(customerPath, "com.servigic.customer")],
];
for (const [name, value] of secrets) {
  if (dry) {
    console.log(`ok     ${name} (${value.length} chars) - not uploaded (dry run)`);
    continue;
  }
  execFileSync("gh", ["secret", "set", name], { input: value, stdio: ["pipe", "inherit", "inherit"] });
  console.log(`set    ${name}`);
}
console.log(dry ? "Files look right." : "Done. Now run the Android builds again (the workflow picks the secrets up).");
