import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";

/**
 * Demo-video YouTube IDs, set by an admin in SiteSettings (any YouTube URL or a
 * bare ID). `pro` autoplays on /pro, `customer` on /services and each service
 * page. Both are null until a video is added, and the pages then show a
 * designed "coming soon" card in the same slot.
 */
export async function getDemoVideos(): Promise<{ customer: string | null; pro: string | null }> {
  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    return {
      customer: s?.demoVideoCustomerUrl ? extractYouTubeId(s.demoVideoCustomerUrl) : null,
      pro: s?.demoVideoProUrl ? extractYouTubeId(s.demoVideoProUrl) : null,
    };
  } catch {
    return { customer: null, pro: null };
  }
}
