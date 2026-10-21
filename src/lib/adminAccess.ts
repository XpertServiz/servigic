import { prisma } from "@/lib/prisma";

// Who may export personal data and see full phone numbers. Only super_admin and growth_admin may export; any
// other admin (adminLevel "admin") sees masked numbers like +92 3xx xxx 4567 and cannot call or open WhatsApp from a row.
export const ADMIN_LEVELS = ["super_admin", "growth_admin", "admin"] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];

export interface AdminAccess {
  level: AdminLevel;
  canExport: boolean;
  maskPhones: boolean;
}

export function accessFor(level: string | null | undefined): AdminAccess {
  const full = level === "super_admin" || level === "growth_admin";
  return { level: (ADMIN_LEVELS as readonly string[]).includes(level ?? "") ? (level as AdminLevel) : "admin", canExport: full, maskPhones: !full };
}

export async function getAdminAccess(userId: string | null | undefined): Promise<AdminAccess> {
  if (!userId) return accessFor("admin");
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { adminLevel: true } });
  return accessFor(u?.adminLevel);
}

/** +923001234567 -> "+92 3xx xxx 4567"; anything unrecognised keeps only its last 4 digits. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  const last4 = digits.slice(-4);
  if (phone.startsWith("+92") && digits.length === 12) return `+92 3xx xxx ${last4}`;
  const cc = phone.startsWith("+") ? `+${digits.slice(0, Math.max(1, digits.length - 10))} ` : "";
  return `${cc}xxx xxx ${last4}`;
}
