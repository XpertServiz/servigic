import type { Prisma } from "@prisma/client";

export interface WaitlistFilters {
  role?: string;
  country?: string;
  city?: string;
  trade?: string;
  from?: string;
  to?: string;
}

/** Turns the admin filters (query string values) into a database filter. Empty values are ignored. */
export function waitlistWhere(f: WaitlistFilters): Prisma.WaitlistSignupWhereInput {
  const where: Prisma.WaitlistSignupWhereInput = {};
  if (f.role === "CUSTOMER" || f.role === "PROVIDER") where.role = f.role;
  if (f.country) where.countryCode = f.country.toUpperCase();
  if (f.city) where.city = { contains: f.city.trim(), mode: "insensitive" };
  if (f.trade) where.trade = f.trade;
  const from = f.from ? new Date(`${f.from}T00:00:00.000Z`) : null;
  const to = f.to ? new Date(`${f.to}T23:59:59.999Z`) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    where.createdAt = {
      ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
      ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}),
    };
  }
  return where;
}

/** One CSV cell: quoted, and a leading = + - @ is neutralised so a spreadsheet never runs it as a formula. */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^\+\d[\d\s]*$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
