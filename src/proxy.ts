import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { splitLocalePath } from "@/i18n/locales";

// RBAC route protection (Master Brief §4: "NextAuth v5 JWT roles + route
// protection via proxy.ts pattern"). Uses the edge-safe authConfig only —
// never import @/lib/auth (Prisma) here, it will break the Edge bundle.
const { auth } = NextAuth(authConfig);

// Note: "/pro" itself is the public provider-acquisition landing page (§7)
// and is intentionally NOT in this list — only the panel sub-routes are gated.
const PROTECTED_PREFIXES: { prefix: string; role: "CUSTOMER" | "PROVIDER" | "ADMIN" | "SUPPORT" }[] = [
  { prefix: "/dashboard", role: "CUSTOMER" },
  { prefix: "/jobs/new", role: "CUSTOMER" },
  { prefix: "/bookings", role: "CUSTOMER" },
  { prefix: "/pro/dashboard", role: "PROVIDER" },
  { prefix: "/pro/jobs", role: "PROVIDER" },
  { prefix: "/pro/bookings", role: "PROVIDER" },
  { prefix: "/pro/earnings", role: "PROVIDER" },
  { prefix: "/pro/profile", role: "PROVIDER" },
  // Reviewers (SUPPORT) may open the verification queue only; ADMIN passes every check below.
  { prefix: "/admin/verification", role: "SUPPORT" },
  { prefix: "/admin", role: "ADMIN" },
];

const LOCALE_COOKIE = "servigic_locale";

// The language-prefix step runs BEFORE the auth wrapper on purpose: the wrapper
// rebuilds req.nextUrl from AUTH_URL (the production origin), and a rewrite to
// that origin would proxy the request to the live site instead of rendering here.
const authed = auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if ((pathname === "/login" || pathname === "/signup") && user) {
    const home =
      user.role === "ADMIN" ? "/admin" : user.role === "SUPPORT" ? "/admin/verification" : user.role === "PROVIDER" ? "/pro/dashboard" : "/dashboard";
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

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  // /de/pro → serve /pro in German. The language travels to the server
  // components as a request header, and is remembered in the cookie so the
  // visitor stays in that language across app/auth pages too.
  const { locale, path } = splitLocalePath(req.nextUrl.pathname);
  if (locale) {
    const url = req.nextUrl.clone();
    url.pathname = path;
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-servigic-locale", locale);
    // Panels are never language-prefixed: send them to the real URL, where RBAC applies.
    const isPanel = PROTECTED_PREFIXES.some(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`));
    const res = isPanel ? NextResponse.redirect(url) : NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    if (req.cookies.get(LOCALE_COOKIE)?.value !== locale) {
      res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return res;
  }
  return (authed as unknown as NextMiddleware)(req, event);
}

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
    // Language-prefixed marketing URLs (/ur, /de/pro, /ar/services/...). English is unprefixed.
    "/(ur|ar|de|fr|es|hi|pl|tr|it|pt|nl)",
    "/(ur|ar|de|fr|es|hi|pl|tr|it|pt|nl)/:path*",
  ],
};
