import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { csvCell, waitlistWhere } from "@/lib/waitlistQuery";

// CSV of the early list. mode=all: every column (respecting the filters). mode=launch: just who to message when the
// apps go live - WhatsApp number, email and language, one row per person.
export async function GET(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const q = new URL(req.url).searchParams;
  const where = waitlistWhere({
    role: q.get("role") ?? undefined,
    country: q.get("country") ?? undefined,
    city: q.get("city") ?? undefined,
    trade: q.get("trade") ?? undefined,
    from: q.get("from") ?? undefined,
    to: q.get("to") ?? undefined,
  });
  const rows = await prisma.waitlistSignup.findMany({ where, orderBy: { createdAt: "desc" } });

  const launch = q.get("mode") === "launch";
  const header = launch
    ? ["WhatsApp", "Email", "Language", "Name", "Role", "Country"]
    : ["Joined", "Role", "Name", "WhatsApp", "Country", "Detected country", "Detected region", "City", "Area", "Email", "Trade", "Experience (years)", "Gmail", "Language", "Source page", "UTM", "Referred by", "Referral code", "Consent at"];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    const cells = launch
      ? [r.whatsapp, r.email, r.language, r.name, r.role, r.countryCode]
      : [r.createdAt.toISOString(), r.role, r.name, r.whatsapp, r.countryCode, r.detectedCountry, r.detectedRegion, r.city, r.area, r.email, r.trade, r.experienceYears, r.gmail, r.language, r.sourcePage, r.utm ? JSON.stringify(r.utm) : "", r.referredByCode, r.referralCode, r.consentAt.toISOString()];
    lines.push(cells.map(csvCell).join(","));
  }

  // The leading BOM lets Excel read Urdu / Arabic names correctly.
  const body = `﻿${lines.join("\r\n")}\r\n`;
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="servigic-${launch ? "launch-message" : "waitlist"}-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
