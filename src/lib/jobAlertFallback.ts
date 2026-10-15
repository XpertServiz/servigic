import { getFeatureFlags } from "@/lib/featureFlags";

/**
 * Phase-2 fallback (handoff §11.5 item 6): if a matched pro has not opened the push within
 * ~2 minutes and the job is still unbid, send an SMS/WhatsApp with a link.
 *
 * STUB ON PURPOSE. It costs money per message, so it stays behind the
 * `smsFallbackEnabled` feature flag (default off) until the founder approves a budget.
 * When wired up it must respect MAX_ALERTS_PER_PRO_PER_JOB, quiet hours, the daily cap
 * and pause switch exactly like the push path (see dispatchJob in src/lib/dispatch.ts).
 */
export async function sendUnbidJobFallbacks(): Promise<{ enabled: boolean; sent: number }> {
  const flags = await getFeatureFlags();
  if (!flags.smsFallbackEnabled) return { enabled: false, sent: 0 };
  // TODO(phase 2): select DispatchAlert rows older than 2 min with pushSent=true, job still OPEN with no
  // bid from that pro, alertCount < MAX_ALERTS_PER_PRO_PER_JOB; send via sendSmsChannel / sendWhatsappChannel;
  // increment alertCount. Intentionally not implemented until a per-message budget is approved.
  console.warn("[jobAlertFallback] smsFallbackEnabled is on but the sender is not implemented yet");
  return { enabled: true, sent: 0 };
}
