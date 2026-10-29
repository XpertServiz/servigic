import { prisma } from "@/lib/prisma";
import { CancelReferralButton } from "./CancelReferralButton";
import { ReferralToggle } from "./ReferralToggle";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  PENDING: "text-accent border-accent/30 bg-accent/10",
  RELEASED: "text-secondary border-secondary/30 bg-secondary/10",
  REJECTED: "text-danger border-danger/30 bg-danger/10",
};

const REASONS: Record<string, string> = {
  SELF_REFERRAL: "Same person / phone as the referrer",
  SAME_DEVICE_AS_REFERRER: "Signed up on the referrer's phone",
  PHONE_ALREADY_REFERRED: "This phone number was already referred",
  DEVICE_ALREADY_USED: "This device already made another account",
  RATE_LIMIT: "Referrer exceeded the daily limit",
  ADMIN_CANCELLED: "Cancelled by an admin",
};

export default async function AdminReferralsPage() {
  const [settings, referrals] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.referral.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(referrals.flatMap((r) => [r.referrerId, r.referredUserId]))) } },
    select: { id: true, name: true, phone: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const paid = referrals.filter((r) => r.status === "RELEASED").reduce((s, r) => s + r.referrerRewardPKR + r.refereeRewardPKR, 0);
  const count = (status: string) => referrals.filter((r) => r.status === status).length;

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Referrals</h1>
      <p className="mb-6 max-w-3xl text-text-muted">
        Programme is <b className={settings?.referralsEnabled ? "text-secondary" : "text-danger"}>{settings?.referralsEnabled ? "ON" : "OFF"}</b>. Customer credit: PKR{" "}
        {settings?.referralCustomerCreditPKR ?? 200} each, after the new customer&apos;s first completed and paid job. Pro bonus: PKR {settings?.referralProBonusPKR ?? 500} after{" "}
        {settings?.referralProJobsRequired ?? 5} completed jobs. Change these in Settings.
      </p>

      <ReferralToggle enabled={Boolean(settings?.referralsEnabled)} />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Pending", count("PENDING")],
          ["Rewards released", count("RELEASED")],
          ["Blocked", count("REJECTED")],
          ["Paid out (PKR)", paid.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
            <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Referrer</th>
              <th className="p-4">New user</th>
              <th className="p-4">Type</th>
              <th className="p-4">Reward</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => {
              const referrer = byId.get(r.referrerId);
              const referred = byId.get(r.referredUserId);
              return (
                <tr key={r.id} className="border-t border-border-subtle">
                  <td className="p-4">
                    <div className="font-semibold">{referrer?.name ?? "-"}</div>
                    <div className="text-xs text-text-muted">{referrer?.phone}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold">{referred?.name ?? "-"}</div>
                    <div className="text-xs text-text-muted">{referred?.phone}</div>
                  </td>
                  <td className="p-4 text-text-muted">{r.role === "PROVIDER" ? `Pro (after ${r.jobsRequired} jobs)` : "Customer (first job)"}</td>
                  <td className="p-4 text-text-muted">
                    PKR {r.referrerRewardPKR}
                    {r.refereeRewardPKR > 0 ? ` + ${r.refereeRewardPKR}` : ""}
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_TONE[r.status]}`}>{r.status}</span>
                    {r.rejectReason && <div className="mt-1 text-xs text-text-muted">{REASONS[r.rejectReason] ?? r.rejectReason}</div>}
                  </td>
                  <td className="p-4 text-right">{r.status === "PENDING" && <CancelReferralButton id={r.id} />}</td>
                </tr>
              );
            })}
            {referrals.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-muted">
                  No referrals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
