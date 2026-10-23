import { headers } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMarkets, marketForCity } from "@/lib/marketConfig";
import { countryOfPhone } from "@/lib/phone";
import { agreementText, getAgreement, type Agreement, type AgreementRole } from "./agreements";

// Recording and checking the e-signed acceptance of the Customer Terms / Pro Agreement (see agreements.ts).

export const agreementRole = (role: Role | string): AgreementRole | null => (role === "PROVIDER" ? "PROVIDER" : role === "CUSTOMER" ? "CUSTOMER" : null);

/** The country whose agreement applies to a user: the country of their city's market, else of their phone number, else the request's IP. */
export async function agreementCountry(user: { city?: string | null; phone?: string | null }, fallback?: string | null): Promise<string> {
  const market = user.city ? marketForCity(await getMarkets(), user.city) : null;
  if (market?.countryCode) return market.countryCode;
  const fromPhone = countryOfPhone(user.phone);
  if (fromPhone) return fromPhone;
  if (fallback && /^[A-Z]{2}$/i.test(fallback)) return fallback.toUpperCase();
  const h = await headers();
  return (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "XX").toUpperCase();
}

/** What the client says it accepted. It must be the current version of the exact text, or the acceptance is refused. */
export interface AcceptanceInput {
  version?: string;
  hash?: string;
  signedName?: string;
  locale?: string;
}

export function checkAcceptance(input: AcceptanceInput | undefined | null, agreement: Agreement): string | null {
  if (!input || !input.signedName || input.signedName.trim().length < 2) return "Please read and accept the agreement, and type your full name to sign it.";
  if (input.version !== agreement.version || input.hash !== agreement.hash) return "The agreement has been updated. Please read and accept the latest version.";
  return null;
}

export async function recordAcceptance(opts: { userId: string; role: AgreementRole; agreement: Agreement; input: AcceptanceInput; source: "web" | "app" }) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  return prisma.termsAcceptance.create({
    data: {
      userId: opts.userId,
      role: opts.role,
      document: opts.agreement.kind,
      country: opts.agreement.country,
      version: opts.agreement.version,
      docHash: opts.agreement.hash,
      documentText: agreementText(opts.agreement),
      signedName: (opts.input.signedName ?? "").trim().slice(0, 120),
      ip,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      locale: opts.input.locale?.slice(0, 10) ?? null,
      source: opts.source,
    },
  });
}

/** The agreement a signed-in user still has to accept (a new version, or an account made before e-signing existed), or null. */
export async function pendingAgreement(userId: string): Promise<Agreement | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, city: true, phone: true } });
  const role = user ? agreementRole(user.role) : null;
  if (!user || !role) return null;
  const agreement = getAgreement(role, await agreementCountry(user));
  const done = await prisma.termsAcceptance.findFirst({ where: { userId, document: agreement.kind, version: agreement.version, country: agreement.country }, select: { id: true } });
  return done ? null : agreement;
}
