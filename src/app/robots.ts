import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, transactional or purely functional routes: nothing here should ever rank.
        disallow: ["/api/", "/admin", "/dashboard", "/bookings", "/jobs", "/pro/dashboard", "/pro/jobs", "/pro/bookings", "/pro/earnings", "/pro/profile", "/pro/plans", "/post-login", "/verify-otp", "/login", "/signup"],
      },
      // Aggressive SEO / scraping crawlers: they bring no visitors and each hit renders a page.
      { userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "BLEXBot", "DataForSeoBot", "PetalBot", "Bytespider"], disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
