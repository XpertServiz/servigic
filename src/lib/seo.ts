import type { Metadata } from "next";
import { LOCALES, DEFAULT_LOCALE, localeMeta, localizePath, type Locale } from "@/i18n/locales";

// Canonical production origin. Always the www host so every canonical,
// hreflang and sitemap URL agrees (mixed hosts split ranking signals).
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL && /^https:\/\/www\.servigic\.com/.test(process.env.NEXT_PUBLIC_APP_URL)
  ? process.env.NEXT_PUBLIC_APP_URL
  : "https://www.servigic.com"
).replace(/\/$/, "");

export const SITE_NAME = "Servigic";

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/** Every language version of a marketing page, for hreflang + the sitemap. */
export function languageAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[l.hreflang] = absoluteUrl(localizePath(path, l.code));
  out["x-default"] = absoluteUrl(path);
  return out;
}

interface PageSeo {
  /** Unprefixed path of the page, e.g. "/pro" or "/services/electrician/karachi". */
  path: string;
  locale: Locale;
  title: string | { absolute: string };
  description: string;
  keywords?: string[];
  /** Keep private/transactional pages out of the index. */
  noindex?: boolean;
  type?: "website" | "article";
}

/** One place that builds title/description/canonical/hreflang/OG/Twitter for a marketing page. */
export function pageMetadata({ path, locale, title, description, keywords, noindex, type = "website" }: PageSeo): Metadata {
  const url = absoluteUrl(localizePath(path, locale));
  const meta = localeMeta(locale);
  const plainTitle = typeof title === "string" ? `${title} | ${SITE_NAME}` : title.absolute;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url, languages: languageAlternates(path) },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title: plainTitle,
      description,
      locale: meta.og,
      alternateLocale: LOCALES.filter((l) => l.code !== locale).map((l) => l.og),
      images: [{ url: absoluteUrl("/og"), width: 1200, height: 630, alt: plainTitle }],
    },
    twitter: { card: "summary_large_image", title: plainTitle, description, images: [absoluteUrl("/og")] },
  };
}

// ─── JSON-LD ───
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.png`, width: 512, height: 512 },
    sameAs: [] as string[],
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", availableLanguage: LOCALES.map((l) => l.english) }],
  };
}

export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: localeMeta(locale).hreflang,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function localBusinessJsonLd(description: string, cities: string[] = ["Karachi", "Lahore", "Islamabad", "Rawalpindi"]) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#service`,
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}/icons/icon-512.png`,
    description,
    areaServed: cities.map((c) => ({ "@type": "City", name: c })),
    priceRange: "$$",
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; path: string }[], locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(localizePath(c.path, locale)) })),
  };
}

export function serviceJsonLd(opts: { name: string; description: string; city: string; path: string; locale: Locale }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "City", name: opts.city },
    url: absoluteUrl(localizePath(opts.path, opts.locale)),
  };
}

export { DEFAULT_LOCALE };
