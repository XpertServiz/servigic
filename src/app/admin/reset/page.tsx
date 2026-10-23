import { auth } from "@/lib/auth";
import { getAdminAccess } from "@/lib/adminAccess";
import { WIPE_PARTS } from "@/lib/admin/purge";
import { ResetClient } from "./ResetClient";

// Reset / wipe test data before launch (super admin only). Pro leads are off by default: they are real prospects, not test data.
export default async function ResetPage() {
  const session = await auth();
  const access = await getAdminAccess(session?.user?.id);
  const parts = Object.entries(WIPE_PARTS).map(([key, v]) => ({ key, label: v.label, defaultOn: key !== "proLeads" }));
  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Reset / wipe test data</h1>
      <p className="mb-8 max-w-3xl text-text-muted">
        Removes test accounts and everything they created (jobs, bids, bookings, reviews, messages, payments, wallets…) so Servigic can start clean.
        Preview first: the preview runs the whole wipe and then undoes it, so the numbers are exact.
      </p>
      {access.level === "super_admin" ? (
        <ResetClient parts={parts} />
      ) : (
        <p className="rounded-[14px] border border-border-subtle p-5 text-text-muted">Only a super admin can reset data.</p>
      )}
    </div>
  );
}
