import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/i18n/request";

const schema = z.object({ locale: z.enum(SUPPORTED_LOCALES) });

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });

  const cookieStore = await cookies();
  cookieStore.set("servigic_locale", parsed.data.locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  return NextResponse.json({ ok: true });
}
