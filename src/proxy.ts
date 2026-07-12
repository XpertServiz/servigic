import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// RBAC route protection (Master Brief §4: "NextAuth v5 JWT roles + route
// protection via proxy.ts pattern"). Uses the edge-safe authConfig only —
// never import @/lib/auth (Prisma) here, it will break the Edge bundle.
const { auth } = NextAuth(authConfig);

// Note: "/pro" itself is the public provider-acquisition landing page (§7)
// and is intentionally NOT in this list — only the panel sub-routes are gated.
const PROTECTED_PREFIXES: { prefix: string; role: "CUSTOMER" | "PROVIDER" | "ADMIN" }[] = [
  { prefix: "/dashboard", role: "CUSTOMER" },
  { prefix: "/jobs/new", role: "CUSTOMER" },
  { prefix: "/bookings", role: "CUSTOMER" },
  { prefix: "/pro/dashboard", role: "PROVIDER" },
  { prefix: "/pro/jobs", role: "PROVIDER" },
  { prefix: "/pro/bookings", role: "PROVIDER" },
  { prefix: "/pro/earnings", role: "PROVIDER" },
  { prefix: "/pro/profile", role: "PROVIDER" },
  { prefix: "/admin", role: "ADMIN" },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if ((pathname === "/login" || pathname === "/signup") && user) {
    const home = user.role === "ADMIN" ? "/admin" : user.role === "PROVIDER" ? "/pro/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(home, req.nextUrl.origin));
  }

  const matched = PROTECTED_PREFIXES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!matched) return NextResponse.next();

  if (!user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user.role !== matched.role && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/new",
    "/bookings/:path*",
    "/pro/dashboard/:path*",
    "/pro/jobs/:path*",
    "/pro/bookings/:path*",
    "/pro/earnings/:path*",
    "/pro/profile/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
