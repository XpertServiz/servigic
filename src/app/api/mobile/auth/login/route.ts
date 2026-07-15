import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";
import { issueMobileToken } from "@/lib/mobileAuth";

// Mobile equivalent of the web credentials sign-in — issues a long-lived JWT
// instead of a session cookie (React Native has no first-class cookie jar
// across app restarts). Reuses the same User/passwordHash as the web app.
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid phone or password" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) {
    return NextResponse.json({ error: "Incorrect phone number or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect phone number or password" }, { status: 401 });
  }

  const token = await issueMobileToken({
    id: user.id,
    role: user.role,
    phone: user.phone,
    name: user.name,
    language: user.language,
  });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, phone: user.phone, phoneVerified: user.phoneVerified },
  });
}
