// The two apps share a design system, i18n, ads, sound and a few screens by
// copy (not an npm workspace — see mobile/README.md). apps/pro is the source of
// truth for the files below; run this after editing any of them:
//
//   node mobile/tools/sync-shared.mjs
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "apps");
const from = join(root, "pro");
const to = join(root, "customer");

const SHARED = [
  "App.tsx",
  "src/lib/theme.ts",
  "src/lib/phone.ts",
  "src/lib/status.ts",
  "src/lib/sound.ts",
  "src/lib/notifications.ts",
  "src/lib/ads.ts",
  "src/lib/market.ts",
  "src/lib/device.ts",
  "src/lib/voiceAlerts.ts",
  "src/lib/notificationNav.ts",
  "src/lib/globalFont.ts",
  "src/lib/i18n",
  "src/components/Icon.tsx",
  "src/components/ds.tsx",
  "src/components/ui.tsx",
  "src/components/LogoMark.tsx",
  "src/components/MapPins.tsx",
  "src/components/TabBar.tsx",
  "src/components/AdSlots.tsx",
  "src/components/MarketNotice.tsx",
  "src/components/ReferralCard.tsx",
  "src/components/DraggableSheet.tsx",
  "src/components/RangeSlider.tsx",
  "src/components/HeaderActions.tsx",
  "src/components/LanguageSuggestion.tsx",
  "src/screens/LanguageScreen.tsx",
  "src/screens/NotificationsScreen.tsx",
  "src/screens/MessageThreadScreen.tsx",
  "src/screens/VerifyOtpScreen.tsx",
  "src/navigation/ref.ts",
];

for (const rel of SHARED) {
  mkdirSync(dirname(join(to, rel)), { recursive: true });
  cpSync(join(from, rel), join(to, rel), { recursive: true });
}

// auth.tsx is identical except for the role literal.
const auth = readFileSync(join(from, "src/lib/auth.tsx"), "utf8").replace('role: "PROVIDER"', 'role: "CUSTOMER"');
writeFileSync(join(to, "src/lib/auth.tsx"), auth);

console.log(`Synced ${SHARED.length + 1} shared files from apps/pro to apps/customer`);
