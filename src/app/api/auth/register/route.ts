import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { issueOtp } from "@/lib/otp";
import { phoneVariants } from "@/lib/phone";
import { attachReferral } from "@/lib/referrals";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { role, name, phone, email, password, city, referralCode, deviceId } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { phone: { in: phoneVariants(phone) } } });
  if (existing) {
    // An admin posted jobs for this number before the customer had the app: this registration claims that
    // account (so the job history carries over) once the phone code is verified — see verifyOtp().
    if (existing.managedByAdmin && existing.role === "CUSTOMER" && role === "CUSTOMER") {
      if (email) {
        const emailTaken = await prisma.user.findFirst({ where: { email, id: { not: existing.id } }, select: { id: true } });
        if (emailTaken) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: { pendingPasswordHash: await bcrypt.hash(password, 12), pendingName: name, pendingEmail: email ?? null, city: existing.city ?? city },
      });
      await issueOtp(existing.id, existing.phone, "PHONE_VERIFY", email);
      return NextResponse.json({ userId: existing.id, phone: existing.phone });
    }
    return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      role,
      name,
      phone,
      email,
      passwordHash,
      city,
    },
  });

  if (role === "PROVIDER") {
    await prisma.providerProfile.create({
      data: { userId: user.id, displayName: name },
    });
  }

  // Referral code + device check. A bad code or a blocked (abusive) referral never stops the sign-up itself.
  const referral = await attachReferral({ newUserId: user.id, role, phone: user.phone, code: referralCode, deviceId }).catch(() => ({ status: "invalid" as const }));

  await issueOtp(user.id, user.phone, "PHONE_VERIFY", user.email);

  // Only "applied" / "invalid" are told to the app; a rejection looks like "no referral" so abusers learn nothing.
  return NextResponse.json({ userId: user.id, phone: user.phone, referral: referral.status === "applied" ? "applied" : referralCode ? "invalid" : "none" });
}
