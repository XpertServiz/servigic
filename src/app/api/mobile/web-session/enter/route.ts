import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const SESSION_DAYS = 7;

// Opens the admin website already signed in: checks the one-time link made in ../route.ts, then sets the same session cookie the
// website's own sign-in sets, and sends the web view on to the page.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? "/admin";
  const dest = /^\/admin(\/|$|\?)/.test(to) ? to : "/admin";
  const fail = () => NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(dest)}`, url.origin));
  const secret = process.env.MOBILE_JWT_SECRET;
  const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const handoff = url.searchParams.get("h");
  if (!secret || !authSecret || !handoff) return fail();
  let id: string;
  try {
    const { payload } = await jwtVerify(handoff, new TextEncoder().encode(secret));
    if (payload.purpose !== "web-handoff" || typeof payload.id !== "string") return fail();
    id = payload.id;
  } catch {
    return fail();
  }
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, phone: true, language: true, avatarUrl: true } });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPPORT")) return fail();

  const secure = url.protocol === "https:";
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token";
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const value = await encode({ token: { sub: user.id, name: user.name, id: user.id, role: user.role, phone: user.phone, language: user.language, avatarUrl: user.avatarUrl }, secret: authSecret, salt: cookieName, maxAge });
  const res = NextResponse.redirect(new URL(dest, url.origin));
  res.cookies.set(cookieName, value, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
