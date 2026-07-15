import { PrismaClient, Trade, Currency, AccountType, Language } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Starter Chart of Accounts — minimal but complete for a marketplace-escrow
// business. Admin can add more via /admin/accounting/chart-of-accounts.
// 1000/2000/4000 are "system" accounts used by auto-posting — see
// src/lib/accounting/postJournalEntry.ts SYSTEM_ACCOUNTS.
const CHART_OF_ACCOUNTS: { code: string; name: string; type: AccountType; isSystem: boolean }[] = [
  { code: "1000", name: "Cash & Bank (JazzCash/EasyPaisa/Bank)", type: "ASSET", isSystem: true },
  { code: "2000", name: "Escrow Payable to Providers", type: "LIABILITY", isSystem: true },
  { code: "3000", name: "Owner's Equity", type: "EQUITY", isSystem: false },
  { code: "4000", name: "Commission Income", type: "REVENUE", isSystem: true },
  { code: "5000", name: "Operating Expenses", type: "EXPENSE", isSystem: false },
];

// Rough July-2026 ballpark rates (units of currency per 1 PKR) — admin can
// update these anytime at /admin/exchange-rates. Display-only, see
// src/lib/currency.ts.
const EXCHANGE_RATES: { currency: Currency; ratePerPKR: number }[] = [
  { currency: "USD", ratePerPKR: 0.0036 },
  { currency: "CAD", ratePerPKR: 0.0049 },
  { currency: "EUR", ratePerPKR: 0.0033 },
  { currency: "PLN", ratePerPKR: 0.0142 },
  { currency: "SAR", ratePerPKR: 0.0135 },
  { currency: "AED", ratePerPKR: 0.0132 },
  { currency: "QAR", ratePerPKR: 0.0131 },
];

const CATEGORIES: { trade: Trade; name: string; slug: string; icon: string; minPricePKR: number; maxPricePKR: number }[] = [
  { trade: "PLUMBER", name: "Plumber", slug: "plumber", icon: "🔧", minPricePKR: 1200, maxPricePKR: 8000 },
  { trade: "ELECTRICIAN", name: "Electrician", slug: "electrician", icon: "💡", minPricePKR: 1000, maxPricePKR: 6000 },
  { trade: "AC_TECHNICIAN", name: "AC Technician", slug: "ac-technician", icon: "❄️", minPricePKR: 1800, maxPricePKR: 12000 },
  { trade: "SOLAR_INSTALLER", name: "Solar Installer", slug: "solar-installer", icon: "☀️", minPricePKR: 8500, maxPricePKR: 250000 },
  { trade: "CARPENTER", name: "Carpenter", slug: "carpenter", icon: "🪚", minPricePKR: 1500, maxPricePKR: 20000 },
  { trade: "PAINTER", name: "Painter", slug: "painter", icon: "🎨", minPricePKR: 3000, maxPricePKR: 60000 },
  { trade: "APPLIANCE_REPAIR", name: "Appliance Repair", slug: "appliance-repair", icon: "🧺", minPricePKR: 1400, maxPricePKR: 9000 },
  { trade: "CAR_MECHANIC", name: "Car Mechanic", slug: "car-mechanic", icon: "🚗", minPricePKR: 1600, maxPricePKR: 15000 },
  { trade: "MOVERS", name: "Movers", slug: "movers", icon: "📦", minPricePKR: 4000, maxPricePKR: 40000 },
  { trade: "CLEANER", name: "Cleaner", slug: "cleaner", icon: "🧹", minPricePKR: 1800, maxPricePKR: 10000 },
  { trade: "MASON", name: "Mason", slug: "mason", icon: "🧱", minPricePKR: 2200, maxPricePKR: 50000 },
  { trade: "HANDYMAN", name: "Handyman", slug: "handyman", icon: "🛠️", minPricePKR: 900, maxPricePKR: 5000 },
];

const LAUNCH_CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi"];

// Geo-Localized Landing Page Addendum v5 §6 — legal disclaimer text is data,
// not code, so it lives here (editable at /admin/locales without a
// redeploy). Only PK is isLive: true — matches markets.ts LIVE/COMING_SOON
// and GCC_EXPANSION.md, which is explicit that flipping a country live is a
// real payments/compliance milestone, not a config toggle.
const LOCALE_CONFIGS: {
  countryCode: string;
  countryName: string;
  language: Language;
  direction: string;
  currency: Currency;
  paymentMethodsShown: string[];
  legalDisclaimer: string;
  isLive: boolean;
  citiesLive: string[];
}[] = [
  {
    countryCode: "PK",
    countryName: "Pakistan",
    language: "en",
    direction: "ltr",
    currency: "PKR",
    paymentMethodsShown: ["JAZZCASH", "EASYPAISA", "BANK_TRANSFER"],
    legalDisclaimer:
      "Payments are held safely by Servigic via JazzCash, EasyPaisa, or bank transfer and released to your pro only after you confirm the job is done.",
    isLive: true,
    citiesLive: LAUNCH_CITIES,
  },
  {
    countryCode: "US",
    countryName: "United States",
    language: "en",
    direction: "ltr",
    currency: "USD",
    paymentMethodsShown: ["CARD"],
    legalDisclaimer:
      "Servigic verifies provider identity and ratings; licensing requirements vary by state and trade — customers should confirm licensing for regulated trades like electrical or plumbing where required locally. Sales tax may apply depending on your state.",
    isLive: false,
    citiesLive: [],
  },
  {
    countryCode: "CA",
    countryName: "Canada",
    language: "en",
    direction: "ltr",
    currency: "CAD",
    paymentMethodsShown: ["CARD"],
    legalDisclaimer:
      "Servigic verifies provider identity and ratings; licensing requirements vary by province and trade — customers should confirm licensing where required locally. Prices shown do not include applicable sales tax (GST/HST/PST).",
    isLive: false,
    citiesLive: [],
  },
  {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    language: "ar",
    direction: "rtl",
    currency: "SAR",
    paymentMethodsShown: ["MADA", "STC_PAY", "CARD"],
    legalDisclaimer:
      "Prices shown are VAT-inclusive. Servigic's Saudi commercial registration and full Arabic-reviewed legal terms will be published before this market goes live.",
    isLive: false,
    citiesLive: [],
  },
  {
    countryCode: "DE",
    countryName: "Germany",
    language: "de",
    direction: "ltr",
    currency: "EUR",
    paymentMethodsShown: ["CARD"],
    legalDisclaimer:
      "Prices shown are VAT-inclusive (Preise inkl. MwSt.). This site uses cookies for essential functionality; a full GDPR-compliant consent flow will be published before this market goes live.",
    isLive: false,
    citiesLive: [],
  },
  {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    language: "ar",
    direction: "rtl",
    currency: "AED",
    paymentMethodsShown: ["CARD"],
    legalDisclaimer: "Prices shown are VAT-inclusive. Full local legal terms will be published before this market goes live.",
    isLive: false,
    citiesLive: [],
  },
  {
    countryCode: "QA",
    countryName: "Qatar",
    language: "ar",
    direction: "rtl",
    currency: "QAR",
    paymentMethodsShown: ["CARD"],
    legalDisclaimer: "Full local legal terms will be published before this market goes live.",
    isLive: false,
    citiesLive: [],
  },
];

async function main() {
  console.log("Seeding Servigic…");

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", activeTheme: "electric-amber", defaultCommissionPct: 12 },
  });

  for (const account of CHART_OF_ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }

  for (const rate of EXCHANGE_RATES) {
    await prisma.exchangeRate.upsert({
      where: { currency: rate.currency },
      update: {},
      create: rate,
    });
  }

  for (const locale of LOCALE_CONFIGS) {
    await prisma.localeConfig.upsert({
      where: { countryCode: locale.countryCode },
      update: {},
      create: locale,
    });
  }

  for (const cat of CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { trade: cat.trade },
      update: { name: cat.name, slug: cat.slug, icon: cat.icon, minPricePKR: cat.minPricePKR, maxPricePKR: cat.maxPricePKR },
      create: { ...cat, activeCities: LAUNCH_CITIES },
    });
  }

  const adminPhone = process.env.SEED_ADMIN_PHONE || "03340035233";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Canada786@#";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {},
    create: {
      role: "ADMIN",
      name: "Ather (Founder)",
      phone: adminPhone,
      email: "atheraskarikhan@gmail.com",
      passwordHash: adminPasswordHash,
      phoneVerified: true,
      city: "Karachi",
    },
  });

  console.log(`Seed complete. Admin login → phone: ${adminPhone}, password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
