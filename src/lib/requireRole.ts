import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import type { Session } from "next-auth";

type RequireRoleResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

// Every API route must call this before touching data scoped to a role —
// proxy.ts only gates page navigation, not the underlying API routes.
export async function requireRole(...roles: Role[]): Promise<RequireRoleResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!roles.includes(session.user.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
