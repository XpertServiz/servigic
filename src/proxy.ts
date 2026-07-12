import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// RBAC route protection (Master Brief §4: "NextAuth v5 JWT roles + route
// protection via proxy.ts pattern"). Uses the edge-safe authConfig only —
// never import @/lib/auth (Prisma) here, it will break the Edge bundle.
const { auth } = NextAuth(authConfig);

const ROLE_PREFIXES: Record<string, "CUSTOMER" | "PROVIDER" | "ADMIN"> = {
  "/dashboard": "CUSTOMER",
  "/jobs/new": "CUSTOMER",
  "/bookings": "CUSTOMER",
  "/pro": "PROVIDER",
  "/admin": "ADMIN",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if ((pathname === "/login" || pathname === "/signup") && user) {
    const home = user.role === "ADMIN" ? "/admin" : user.role === "PROVIDER" ? "/pro/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(home, req.nextUrl.origin));
  }

  const matchedPrefix = Object.keys(ROLE_PREFIXES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!matchedPrefix) return NextResponse.next();

  const requiredRole = ROLE_PREFIXES[matchedPrefix];

  if (!user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user.role !== requiredRole && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/jobs/new", "/bookings/:path*", "/pro/:path*", "/admin/:path*", "/login", "/signup"],
};
