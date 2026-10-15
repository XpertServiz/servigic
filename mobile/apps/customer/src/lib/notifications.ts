// Android notification channels for the six alert sounds (redesign spec §8).
// Shared verbatim by apps/customer and apps/pro.
//
// Channel ids are versioned ("-v2") because Android freezes a channel's
// sound/importance at creation — changing either needs a new id. The ids
// here must match CHANNEL_BY_TYPE in the backend's
// src/lib/notify/channels/expoPush.ts. Sound files are bundled into the
// native project by the expo-notifications plugin (see app.json "sounds").
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export const CHANNELS = {
  // v3: a fresh channel for the screen-off job alert - Android freezes a channel's sound/importance at creation, so
  // changing the old "-v2" one on existing installs is impossible. The server sends new-job pushes to this id.
  newJob: "new-job-alert-v3",
  newBid: "new-bid-v1",
  bidUpdate: "bid-update-v1",
  bookingProgress: "booking-progress-v1",
  bidAccepted: "bid-accepted-v2",
  payment: "payment-added-v2",
  jobDone: "job-done-v2",
  message: "message-received-v2",
  status: "job-status-update-v2",
} as const;

const { AndroidImportance, AndroidNotificationVisibility, AndroidAudioUsage, AndroidAudioContentType } = Notifications;

const VIBRATION = {
  newJob: [0, 500, 250, 500, 250, 500],
  newBid: [0, 200, 100, 200],
  bookingProgress: [0, 120, 80, 120],
  bidAccepted: [0, 80, 60, 80, 60, 160],
  payment: [0, 50, 40, 90],
  jobDone: [0, 70, 50, 70, 50, 200],
  message: [0, 40],
  status: [0, 60],
};

// Never bypasses DND and never overrides ringer mode — time-critical alerts
// (new job, bid accepted) are simply high importance so they heads-up with
// sound, and fall back to vibration on a silenced phone.
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

  await Promise.all([
    // IMPORTANCE_HIGH = heads-up pop-up with sound; PUBLIC lockscreen visibility shows the job on a locked phone.
    make(CHANNELS.newJob, "New job alerts", AndroidImportance.HIGH, "new_job_alert.wav", VIBRATION.newJob, true),
    make(CHANNELS.newBid, "New bids", AndroidImportance.HIGH, "new_bid.wav", VIBRATION.newBid),
    // Later bids on the same job update quietly (no sound) so a busy job does not ring again and again.
    make(CHANNELS.bidUpdate, "Bid updates", AndroidImportance.LOW, null, []),
    make(CHANNELS.bookingProgress, "Pro on the way / arrived", AndroidImportance.HIGH, "booking_progress.wav", VIBRATION.bookingProgress),
    make(CHANNELS.bidAccepted, "Bid accepted", AndroidImportance.HIGH, "bid_accepted.wav", VIBRATION.bidAccepted),
    make(CHANNELS.payment, "Payments", AndroidImportance.HIGH, "payment_added.wav", VIBRATION.payment),
    make(CHANNELS.jobDone, "Job completed", AndroidImportance.DEFAULT, "job_done.wav", VIBRATION.jobDone),
    make(CHANNELS.message, "Messages", AndroidImportance.DEFAULT, "message_received.wav", VIBRATION.message),
    make(CHANNELS.status, "Job status updates", AndroidImportance.DEFAULT, "job_status_update.wav", VIBRATION.status),
  ]);
}

/** What Android currently thinks of the job-alert channel (the user can mute or hide it in system settings). */
export async function getJobAlertChannelState(): Promise<"ok" | "muted" | "missing" | "unknown"> {
  if (Platform.OS !== "android") return "unknown";
  try {
    const ch = await Notifications.getNotificationChannelAsync(CHANNELS.newJob);
    if (!ch) return "missing";
    // importance below HIGH means no pop-up; no sound means it will not ring.
    if (ch.importance < AndroidImportance.HIGH || ch.sound == null) return "muted";
    return "ok";
  } catch {
    return "unknown";
  }
}
