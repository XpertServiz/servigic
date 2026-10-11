import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function GET() {
  const auth = await requireRole("CUSTOMER", "PROVIDER", "ADMIN");
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      city: true,
      language: true,
      phoneVerified: true,
      providerProfile: true,
    },
  });

  return NextResponse.json({ user });
}

// Must match the Prisma `Language` enum and mobile/apps/*/src/lib/i18n/languages.ts.
const MOBILE_LANGUAGES = ["en", "ur", "ar", "de", "fr", "pl", "hi", "es"] as const;
const patchSchema = z.object({ language: z.enum(MOBILE_LANGUAGES) });

// Persists the chosen app language against the account (not just the device)
// so it follows the user across reinstalls and phones.
export async function PATCH(req: Request) {
  const auth = await requireRole("CUSTOMER", "PROVIDER", "ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: auth.session.user.id },
    data: { language: parsed.data.language },
    select: { language: true },
  });
  return NextResponse.json({ language: user.language });
}
