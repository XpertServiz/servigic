import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATALOG } from "@/lib/catalog";
import { getCitySlugs } from "@/lib/liveCities";
import { COUNTRY_LANDINGS, LOCALES, localizePath } from "@/i18n/locales";
import { absoluteUrl, languageAlternates } from "@/lib/seo";

// Rebuilt daily; the service list comes from the DB so new categories are indexed automatically.
export const revalidate = 86400;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  ...COUNTRY_LANDINGS.map((c) => ({ path: `/${c}`, priority: 0.95, changeFrequency: "daily" as const })),
  { path: "/services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/pro", priority: 0.9, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/trust-and-safety", priority: 0.7, changeFrequency: "monthly" },
  { path: "/business", priority: 0.6, changeFrequency: "monthly" },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "monthly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "monthly" },
];

async function categorySlugs(): Promise<string[]> {
  try {
    const rows = await prisma.serviceCategory.findMany({ select: { slug: true } });
    if (rows.length > 0) return rows.map((r) => r.slug);
  } catch {
    // fall back to the static catalog
  }
  return SERVICE_CATALOG.map((c) => c.slug);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await categorySlugs();
  const CITY_SLUGS = await getCitySlugs();
  const lastModified = new Date();
  lastModified.setUTCHours(0, 0, 0, 0);

  const pages = [
    ...STATIC_PAGES,
    ...slugs.flatMap((slug) => CITY_SLUGS.map((c) => ({ path: `/services/${slug}/${c.slug}`, priority: 0.8, changeFrequency: "weekly" as const }))),
  ];

  // One URL per language, each pointing at all its siblings (hreflang) so Google serves the right language per country.
  return pages.flatMap((p) =>
    LOCALES.map((l) => ({
      url: absoluteUrl(localizePath(p.path, l.code)),
      lastModified,
      changeFrequency: p.changeFrequency,
      priority: l.code === "en" ? p.priority : Math.max(0.1, p.priority - 0.1),
      alternates: { languages: languageAlternates(p.path) },
    })),
  );
}
