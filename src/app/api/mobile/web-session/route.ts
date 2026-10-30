import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { requireRole } from "@/lib/requireRole";

// The Admin app shows the admin website inside a web view. Instead of typing the password into the website's login form by script
// (fragile), the app asks here - signed in as an admin or staff member - for a one-time link (valid for 90 seconds) that opens the
// website already signed in. See ./enter/route.ts.
export async function POST(req: Request) {
  const auth = await requireRole("ADMIN", "SUPPORT");
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { to?: string };
  const to = typeof body.to === "string" && /^\/admin(\/|$|\?)/.test(body.to) ? body.to : "/admin";
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const handoff = await new SignJWT({ id: auth.session.user.id, purpose: "web-handoff" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90s")
    .sign(new TextEncoder().encode(secret));
  const origin = new URL(req.url).origin;
  return NextResponse.json({ url: `${origin}/api/mobile/web-session/enter?h=${encodeURIComponent(handoff)}&to=${encodeURIComponent(to)}` });
}
