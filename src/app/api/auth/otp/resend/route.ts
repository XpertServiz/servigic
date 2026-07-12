import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";

const schema = z.object({ userId: z.string().cuid() });

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  await issueOtp(user.id, user.phone, "PHONE_VERIFY", user.email);
  return NextResponse.json({ sent: true });
}
