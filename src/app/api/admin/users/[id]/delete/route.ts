import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { getAdminAccess } from "@/lib/adminAccess";
import { deleteUserCompletely } from "@/lib/admin/purge";

export const maxDuration = 120;

// Super admin only: permanently deletes a customer or pro and everything that depends on the account (jobs, bids, bookings,
// reviews, messages, wallet, documents...). ?dryRun=1 only counts what would be deleted.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const access = await getAdminAccess(auth.session.user.id);
  if (access.level !== "super_admin") return NextResponse.json({ error: "Only a super admin can delete accounts." }, { status: 403 });
  const { id } = await params;
  if (id === auth.session.user.id) return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { confirm?: string; dryRun?: boolean };
  if (!body.dryRun && body.confirm !== "DELETE") return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  try {
    const counts = await deleteUserCompletely(id, Boolean(body.dryRun));
    if (!body.dryRun) console.warn(`[admin] user ${id} deleted by ${auth.session.user.id}`, counts);
    return NextResponse.json({ ok: true, dryRun: Boolean(body.dryRun), counts });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delete failed" }, { status: 400 });
  }
}
