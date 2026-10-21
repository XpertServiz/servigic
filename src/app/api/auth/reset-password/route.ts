import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findAccountsByPhone } from "@/lib/accounts";
import { toE164 } from "@/lib/phone";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";

// Step 2 of "Forgot password": the 6-digit code + the new password (typed twice on the form). The new password is set on
// every account that uses this number, so a person who is both a customer and a pro has one password for both.
const schema = z.object({
  phone: z.string().trim().min(5).max(30),
  country: z.string().trim().length(2).optional(),
  code: z.string().trim().length(6),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "INVALID_INPUT" }, { status: 400 });
  const d = parsed.data;
  if (d.confirmPassword !== undefined && d.confirmPassword !== d.password) return NextResponse.json({ error: "The two passwords do not match.", code: "PASSWORD_MISMATCH" }, { status: 400 });

  const phone = toE164(d.phone, ((d.country ?? "PK").toUpperCase() as never) ?? "PK") ?? d.phone;
  const guard = await checkRateLimit(`reset:${phone}:${clientKey(req)}`, 10, 3600);
  if (!guard.ok) return NextResponse.json({ error: "Too many attempts. Please wait a while and try again.", code: "RATE_LIMITED" }, { status: 429 });

  const accounts = await findAccountsByPhone(phone);
  if (accounts.length === 0) return NextResponse.json({ error: "That code is invalid or expired.", code: "BAD_CODE" }, { status: 400 });

  const record = await prisma.otpCode.findFirst({
    where: { userId: { in: accounts.map((a) => a.id) }, code: d.code, purpose: "PASSWORD_RESET", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return NextResponse.json({ error: "That code is invalid or expired.", code: "BAD_CODE" }, { status: 400 });

  const passwordHash = await bcrypt.hash(d.password, 12);
  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    // Receiving the code on the phone also proves the number, so it counts as verified.
    prisma.user.updateMany({ where: { id: { in: accounts.map((a) => a.id) } }, data: { passwordHash, phoneVerified: true } }),
  ]);
  return NextResponse.json({ ok: true });
}
