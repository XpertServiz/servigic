import { prisma } from "@/lib/prisma";

/**
 * Allows `max` hits per `windowSeconds` for a key (an IP, a phone number...). Counts first, records the hit only when it
 * is allowed. A database hiccup never blocks a real person: the check then lets the request through.
 */
export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<{ ok: boolean; remaining: number }> {
  try {
    const since = new Date(Date.now() - windowSeconds * 1000);
    const used = await prisma.rateLimitHit.count({ where: { key, createdAt: { gt: since } } });
    if (used >= max) return { ok: false, remaining: 0 };
    await prisma.rateLimitHit.create({ data: { key } });
    // Housekeeping now and then: nothing older than a day is ever needed.
    if (Math.random() < 0.02) await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } }).catch(() => null);
    return { ok: true, remaining: max - used - 1 };
  } catch {
    return { ok: true, remaining: max };
  }
}

/** The caller's IP for rate-limit keys (from the hosting edge headers); only ever used as an opaque key. */
export function clientKey(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}
