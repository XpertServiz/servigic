import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/visitors";

// Fire-and-forget heartbeat from <VisitorBeacon>. Never fails the page.
export async function POST(req: Request) {
  let view = false;
  try {
    view = Boolean((await req.json())?.view);
  } catch {
    // keep-alive pings may have an empty body
  }
  try {
    await recordVisit(req.headers, view);
  } catch {
    // analytics must never surface an error
  }
  return new NextResponse(null, { status: 204 });
}
