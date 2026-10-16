// Plays the recorded voice alerts (ring + human voice, in the user's app language) INSIDE the app. Shared by
// apps/customer and apps/pro.
//
// Why in-app as well as notification channels: a push notification plays the channel's sound while the app is closed
// or in the background, but while the app is open we must play it ourselves - otherwise the user only hears the old
// short tones. Every stage that has a voice recording plays it here:
//   Pro:      new_job (incoming-job ring), bid_accepted, job_cancelled
//   Customer: request_sent, first_bid, pro_on_the_way, pro_arrived
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { VOICE_SOURCES } from "./voiceAssets";
import { voiceChannelId, type VoiceEvent } from "./notifications";

const players = new Map<string, AudioPlayer>();
let active: AudioPlayer | null = null;
const lastPlayed = new Map<string, number>();
let modeSet = false;

function sourceFor(event: VoiceEvent): { key: string; source: number } | null {
  // The user's language first, English when that language has no recording for the event.
  for (const key of [voiceChannelId(event), `${event}_en`]) {
    if (VOICE_SOURCES[key]) return { key, source: VOICE_SOURCES[key] };
  }
  return null;
}

export const hasVoiceAsset = (event: VoiceEvent) => sourceFor(event) !== null;

/**
 * Plays the voice alert once. The same event is not played again within `dedupeMs`, so a push that arrives in the
 * foreground and the app's own polling both noticing the same thing only speak once.
 */
export async function playVoiceAlert(event: VoiceEvent, opts: { volume?: number; dedupeMs?: number } = {}): Promise<boolean> {
  const found = sourceFor(event);
  if (!found) return false;
  const dedupeMs = opts.dedupeMs ?? 8000;
  const now = Date.now();
  if (dedupeMs > 0 && now - (lastPlayed.get(event) ?? 0) < dedupeMs) return true;
  lastPlayed.set(event, now);
  try {
    if (!modeSet) {
      modeSet = true;
      await setAudioModeAsync({ playsInSilentMode: false });
    }
    try {
      active?.pause();
    } catch {}
    const player = players.get(found.key) ?? createAudioPlayer(found.source);
    players.set(found.key, player);
    player.volume = opts.volume ?? 1;
    player.seekTo(0);
    player.play();
    active = player;
    return true;
  } catch (e) {
    console.warn("[voice] play failed", event, e);
    return false;
  }
}

export function stopVoiceAlert() {
  try {
    active?.pause();
  } catch {}
  active = null;
}

// Push notification `data.type` values (see backend expoPush.ts) -> the spoken event.
const EVENT_BY_PUSH_TYPE: Record<string, VoiceEvent> = {
  DISPATCH_ALERT: "new_job",
  BID_ACCEPTED: "bid_accepted",
  JOB_CANCELLED: "job_cancelled",
  BID_FIRST: "first_bid",
  PRO_ON_THE_WAY: "pro_on_the_way",
  PRO_ARRIVED: "pro_arrived",
};

export function voiceEventForPushType(type: unknown): VoiceEvent | null {
  return typeof type === "string" ? (EVENT_BY_PUSH_TYPE[type] ?? null) : null;
}
