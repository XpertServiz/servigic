import { PrismaClient, Trade } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

async function main() {
  console.log("Seeding Servigic…");

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", activeTheme: "electric-amber", defaultCommissionPct: 12 },
  });

  for (const cat of CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { trade: cat.trade },
      update: { name: cat.name, slug: cat.slug, icon: cat.icon, minPricePKR: cat.minPricePKR, maxPricePKR: cat.maxPricePKR },
      create: { ...cat, activeCities: LAUNCH_CITIES },
    });
  }

  const adminPhone = process.env.SEED_ADMIN_PHONE || "03000000000";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Servigic@Admin1";
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
