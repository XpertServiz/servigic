import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Reads that almost every public page and every app start needs and that change rarely. Cached for 5 minutes so a page view does
// not hit the database for them; Admin > Settings and Admin > Categories refresh them at once when something is saved
// (revalidateTag "site-settings" / "categories").
const REVALIDATE = 300;

export const getSiteSettingsPublic = unstable_cache(
  async () => prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { activeTheme: true, whatsappSupportNumber: true } }),
  ["public-site-settings"],
  { revalidate: REVALIDATE, tags: ["site-settings"] },
);

export const getCategoryList = unstable_cache(
  async () => prisma.serviceCategory.findMany({ select: { id: true, name: true, trade: true, icon: true, slug: true, minPricePKR: true }, orderBy: { name: "asc" } }),
  ["public-categories"],
  { revalidate: REVALIDATE, tags: ["categories"] },
);

export const getCategoryBySlug = unstable_cache(
  async (slug: string) => prisma.serviceCategory.findUnique({ where: { slug }, include: { subServices: true } }),
  ["public-category-by-slug"],
  { revalidate: REVALIDATE, tags: ["categories"] },
);
