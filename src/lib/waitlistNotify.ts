import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendSmsChannel } from "@/lib/notify/channels/sms";
import { getMarkets, acceptsJobs, tradeEnabled, type MarketSnapshot } from "@/lib/marketConfig";
import { pointInPolygons } from "@/lib/geofence";

// When an admin switches a zone (or one of its services) on, tell everyone who asked to be notified for it:
// a push + in-app notice if they have an account, plus an SMS to the phone they left. Each entry is
// messaged once (notifiedAt), so editing a zone again later does not re-send.

function belongsToZone(m: MarketSnapshot, e: { marketId: string | null; zone: string | null; city: string | null; lat: number | null; lng: number | null }): boolean {
  if (e.marketId) return e.marketId === m.id;
  if (m.polygons.length > 0 && e.lat != null && e.lng != null) return pointInPolygons(e.lat, e.lng, m.polygons);
  if (e.zone && e.zone.toLowerCase() === m.name.toLowerCase()) return true;
  // A zone with a drawn boundary is matched by position only; city names are for zones without one.
  if (m.polygons.length === 0 && e.city) return m.cities.some((c) => c.toLowerCase() === e.city!.toLowerCase());
  return false;
}

export async function notifyWaitlistForMarket(marketId: string): Promise<number> {
  const markets = await getMarkets({ fresh: true });
  const market = markets.find((m) => m.id === marketId);
  if (!market || !acceptsJobs(market)) return 0;

  const waiting = await prisma.countryWaitlistEntry.findMany({
    where: { notifiedAt: null, countryCode: market.countryCode },
    take: 2000,
    orderBy: { createdAt: "asc" },
  });
  // Someone waiting for a specific service is only told once THAT service is on in the zone.
  const due = waiting.filter((e) => belongsToZone(market, e) && (!e.trade || tradeEnabled(market, e.trade)));

  let sent = 0;
  for (let i = 0; i < due.length; i += 20) {
    const batch = due.slice(i, i + 20);
    await Promise.allSettled(
      batch.map(async (e) => {
        const service = e.trade ? e.trade.replace(/_/g, " ").toLowerCase() : "home services";
        const title = "Servigic is now live in your area!";
        const body = `${market.name}: you can now book ${service} on Servigic. Open the app to post your first job.`;
        if (e.userId) {
          await notify({ userId: e.userId, type: "SYSTEM", title, body, channels: ["sms"], pushData: { zone: market.name } });
        } else if (e.phone) {
          await sendSmsChannel({ to: e.phone, body: `${title} ${body}` });
        } else {
          return; // email-only entries have no channel wired for this message yet
        }
        await prisma.countryWaitlistEntry.update({ where: { id: e.id }, data: { notifiedAt: new Date(), marketId: market.id } });
        sent++;
      }),
    );
  }
  return sent;
}
