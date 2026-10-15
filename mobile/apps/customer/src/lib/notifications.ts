// Android notification channels. Shared verbatim by apps/customer and apps/pro (apps/*/src/lib/appRole.ts says which app).
//
// Voice alerts: every spoken alert has ONE channel PER LANGUAGE, named "<event>_<lang>" (e.g. "new_job_ur"), and the
// channel's sound is the matching recorded file "<event>_<lang>.ogg" (res/raw, copied in by the expo-notifications
// plugin - see app.json "sounds"). Android plays a channel's sound itself, so the alert is heard with the app closed
// and the screen off. Channel sounds cannot be changed after creation, hence one channel per language.
//   Pro:      new_job, bid_accepted, job_cancelled
//   Customer: first_bid, pro_on_the_way, pro_arrived   (request_sent is played in-app only, quietly)
// The alert language is the user's selected app language; a language with no recordings falls back to English.
// The ids here must match backend src/lib/notify/channels/expoPush.ts.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { APP_ROLE } from "./appRole";

export type VoiceEvent = "new_job" | "bid_accepted" | "job_cancelled" | "request_sent" | "first_bid" | "pro_on_the_way" | "pro_arrived";

/** Languages that have recordings (the kit also has Punjabi "pa": bundled, ready when the app gets a Punjabi language). */
export const VOICE_LANGS = ["en", "ur", "ar", "hi", "fr", "de", "es"] as const;
type VoiceLang = (typeof VOICE_LANGS)[number];
const VOICE_LANG_NAMES: Record<VoiceLang, string> = { en: "English", ur: "Urdu", ar: "Arabic", hi: "Hindi", fr: "French", de: "German", es: "Spanish" };

// Which spoken events become push channels in each app.
const CHANNEL_EVENTS: Record<"PROVIDER" | "CUSTOMER", { event: VoiceEvent; label: string; ring: boolean; vibration: number[] }[]> = {
  PROVIDER: [
    { event: "new_job", label: "New job alert", ring: true, vibration: [0, 500, 250, 500, 250, 500] },
    { event: "bid_accepted", label: "Bid accepted", ring: false, vibration: [0, 80, 60, 80, 60, 160] },
    { event: "job_cancelled", label: "Job cancelled", ring: false, vibration: [0, 120, 80, 120] },
  ],
  CUSTOMER: [
    { event: "first_bid", label: "First bid", ring: false, vibration: [0, 200, 100, 200] },
    { event: "pro_on_the_way", label: "Pro on the way", ring: false, vibration: [0, 120, 80, 120] },
    { event: "pro_arrived", label: "Pro arrived", ring: false, vibration: [0, 200, 100, 200] },
  ],
};

let alertLang: VoiceLang = "en";
/** Called by the i18n provider whenever the app language changes. */
export function setAlertLanguage(lang: string) {
  alertLang = (VOICE_LANGS as readonly string[]).includes(lang) ? (lang as VoiceLang) : "en";
}
export const getAlertLanguage = (): VoiceLang => alertLang;

/** Channel id for a voice event in the user's alert language, e.g. voiceChannelId("new_job") -> "new_job_ur". */
export function voiceChannelId(event: VoiceEvent, lang: string = alertLang): string {
  const l = (VOICE_LANGS as readonly string[]).includes(lang) ? lang : "en";
  return `${event}_${l}`;
}
/** The matching bundled sound file name. */
export const voiceSoundFile = (event: VoiceEvent, lang: string = alertLang) => `${voiceChannelId(event, lang)}.ogg`;

export const CHANNELS = {
  // Later bids on the same job update quietly (no sound) so a busy job does not ring again and again.
  bidUpdate: "bid-update-v1",
  payment: "payment-added-v2",
  jobDone: "job-done-v2",
  message: "message-received-v2",
  status: "job-status-update-v2",
} as const;

// Channels of earlier builds that the voice channels replace; removed so system settings do not show duplicates.
const OBSOLETE_CHANNELS = ["new-job-alert-v2", "new-job-alert-v3", "new-bid-v1", "booking-progress-v1", "bid-accepted-v2"];

const { AndroidImportance, AndroidNotificationVisibility, AndroidAudioUsage, AndroidAudioContentType } = Notifications;

const VIBRATION = {
  payment: [0, 50, 40, 90],
  jobDone: [0, 70, 50, 70, 50, 200],
  message: [0, 40],
  status: [0, 60],
};

// Never bypasses DND and never overrides ringer mode - time-critical alerts are simply high importance so they
// heads-up with sound, and fall back to vibration on a silenced phone.
export async function setupNotificationChannels() {
  if (Platform.OS !== "android") return;
  const make = async (
    id: string,
    name: string,
    importance: Notifications.AndroidImportance,
    sound: string | null,
    vibrationPattern: number[],
    ring = false
  ) => {
    try {
      await Notifications.setNotificationChannelAsync(id, {
        name,
        importance,
        // The sound lives on the CHANNEL (Android plays it itself, even with the app closed and the screen off).
        sound,
        vibrationPattern,
        enableVibrate: vibrationPattern.length > 0,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
          usage: ring ? AndroidAudioUsage.NOTIFICATION_RINGTONE : AndroidAudioUsage.NOTIFICATION,
          contentType: AndroidAudioContentType.SONIFICATION,
        },
        lightColor: "#F5A623",
      });
    } catch (e) {
      console.warn("[notifications] failed to create channel", id, e);
    }
  };

  await Promise.allSettled(OBSOLETE_CHANNELS.map((id) => Notifications.deleteNotificationChannelAsync(id)));

  const voice = CHANNEL_EVENTS[APP_ROLE].flatMap((e) =>
    VOICE_LANGS.map((lang) =>
      // IMPORTANCE_HIGH = heads-up pop-up with sound; PUBLIC lockscreen visibility shows it on a locked phone.
      make(voiceChannelId(e.event, lang), `${e.label} (${VOICE_LANG_NAMES[lang]})`, AndroidImportance.HIGH, voiceSoundFile(e.event, lang), e.vibration, e.ring)
    )
  );

  await Promise.all([
    ...voice,
    make(CHANNELS.bidUpdate, "Bid updates", AndroidImportance.LOW, null, []),
    make(CHANNELS.payment, "Payments", AndroidImportance.HIGH, "payment_added.wav", VIBRATION.payment),
    make(CHANNELS.jobDone, "Job completed", AndroidImportance.DEFAULT, "job_done.wav", VIBRATION.jobDone),
    make(CHANNELS.message, "Messages", AndroidImportance.DEFAULT, "message_received.wav", VIBRATION.message),
    make(CHANNELS.status, "Job status updates", AndroidImportance.DEFAULT, "job_status_update.wav", VIBRATION.status),
  ]);
}

/** What Android currently thinks of the new-job alert channel (the user can mute or hide it in system settings). */
export async function getJobAlertChannelState(): Promise<"ok" | "muted" | "missing" | "unknown"> {
  if (Platform.OS !== "android") return "unknown";
  try {
    const ch = await Notifications.getNotificationChannelAsync(voiceChannelId("new_job"));
    if (!ch) return "missing";
    // importance below HIGH means no pop-up; no sound means it will not ring.
    if (ch.importance < AndroidImportance.HIGH || ch.sound == null) return "muted";
    return "ok";
  } catch {
    return "unknown";
  }
}
