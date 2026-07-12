import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runExpirySweep } from "@/lib/expiry";

export default async function ProviderBookingsPage() {
  await runExpirySweep();
  const session = await auth();

  const bookings = await prisma.booking.findMany({
    where: { providerUserId: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { job: { include: { category: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Bookings</h1>
      <p className="mb-8 text-text-muted">Jobs you&apos;ve won — navigate, update status, and get paid.</p>

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <Link
            key={b.id}
            href={`/pro/bookings/${b.id}`}
            className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-5 hover:border-accent"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{b.job.category.icon}</span>
              <div>
                <div className="font-bold">{b.job.title}</div>
                <div className="text-sm text-text-muted">Payout PKR {b.payoutPKR.toLocaleString()}</div>
              </div>
            </div>
            <span className="rounded-full border border-border-subtle px-3 py-1 text-xs font-bold text-text-muted">
              {b.status.replace("_", " ")}
            </span>
          </Link>
        ))}
        {bookings.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No bookings yet — win a bid to see it here.
          </div>
        )}
      </div>
    </div>
  );
}
