import { NextResponse } from "next/server";
import { notifyJobsWithoutBids } from "@/lib/jobHealth";
import { sendUnbidJobFallbacks } from "@/lib/jobAlertFallback";
import { runExpirySweep } from "@/lib/expiry";

// Called every ~10 minutes by .github/workflows/job-health.yml: tells customers
// whose job has no bids yet, and runs the (flag-gated, stubbed) SMS/WhatsApp fallback.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await runExpirySweep();
  const [noBids, fallback] = await Promise.all([notifyJobsWithoutBids(), sendUnbidJobFallbacks()]);
  return NextResponse.json({ noBidsNotified: noBids, fallback });
}
