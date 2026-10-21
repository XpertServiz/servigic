import bcrypt from "bcryptjs";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { phoneVariants } from "@/lib/phone";

// One phone number can hold a customer account and a pro account (the same person using Servigic both ways). Everything
// that used to "find the user by phone" goes through here so the right account is picked.

/** Every account stored under this number (any of its stored spellings). */
export async function findAccountsByPhone(phone: string): Promise<User[]> {
  return prisma.user.findMany({ where: { phone: { in: phoneVariants(phone) } }, orderBy: { createdAt: "asc" } });
}

export const roleLabel = (role: Role | string) => (role === "PROVIDER" ? "Pro" : role === "CUSTOMER" ? "Customer" : role === "ADMIN" ? "Admin" : "Staff");

/**
 * The account to sign in to: among the accounts whose password matches, the one with the wanted role, else the only match.
 * Staff (admin / reviewer) accounts match any request. Returns null when no password matches.
 */
export async function pickAccount(users: User[], password: string, wanted?: Role | null): Promise<User | null> {
  const matches: User[] = [];
  for (const u of users) {
    if (await bcrypt.compare(password, u.passwordHash)) matches.push(u);
  }
  if (matches.length === 0) return null;
  if (wanted) {
    const exact = matches.find((u) => u.role === wanted);
    if (exact) return exact;
  }
  // No role asked for (old app versions, web without a choice): staff first, then customer, then pro.
  const order: Role[] = ["ADMIN", "SUPPORT", "CUSTOMER", "PROVIDER"];
  return [...matches].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))[0];
}

/** True when this password opens at least one of the accounts (used to link a second role to the same number). */
export async function passwordMatchesAny(users: User[], password: string): Promise<User | null> {
  for (const u of users) {
    if (await bcrypt.compare(password, u.passwordHash)) return u;
  }
  return null;
}
