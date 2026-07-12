import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobileAuth";
import type { Role } from "@prisma/client";
import type { Session } from "next-auth";

type RequireRoleResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

// Resolves the caller from either a NextAuth session cookie (web) or a
// mobile Bearer JWT (Expo apps, issued by /api/mobile/auth/login) — same
// Session shape either way, so every existing route works for both callers
// with zero per-route changes.
async function resolveSession(): Promise<Session | null> {
  const headerList = await headers();
  const authHeader = headerList.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const payload = await verifyMobileToken(authHeader.slice(7));
    if (!payload) return null;
    return {
      user: {
        id: payload.id,
        role: payload.role,
        phone: payload.phone,
        name: payload.name,
        language: payload.language,
      },
      expires: "",
    } as Session;
  }

  return auth();
}

// Every API route must call this before touching data scoped to a role —
// proxy.ts only gates page navigation, not the underlying API routes.
export async function requireRole(...roles: Role[]): Promise<RequireRoleResult> {
  const session = await resolveSession();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!roles.includes(session.user.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
