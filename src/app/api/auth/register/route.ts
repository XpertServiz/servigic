import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { issueOtp } from "@/lib/otp";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { role, name, phone, email, password, city } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      role,
      name,
      phone,
      email: email || null,
      passwordHash,
      city,
    },
  });

  if (role === "PROVIDER") {
    await prisma.providerProfile.create({
      data: { userId: user.id, displayName: name },
    });
  }

  await issueOtp(user.id, user.phone);

  return NextResponse.json({ userId: user.id, phone: user.phone });
}
