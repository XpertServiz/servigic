// Short local alert sounds — bid/status "beep"s and the incoming-job ring.
// Not a real npm workspace package — apps/customer/src/lib/sound.ts and
// apps/pro/src/lib/sound.ts are exact copies (assets/sounds/*.wav are also
// duplicated per-app since Metro resolves `require` relative to each app).
// Every call is guarded — a missing/unavailable audio device must never be
// able to crash a status update or a bid submission.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

let modeConfigured = false;
async function ensureAudioMode() {
  if (modeConfigured) return;
  modeConfigured = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {}
}

let beepPlayer: AudioPlayer | null = null;
let chimePlayer: AudioPlayer | null = null;
let ringPlayer: AudioPlayer | null = null;

function getPlayer(cache: "beep" | "chime" | "ring"): AudioPlayer | null {
  try {
    if (cache === "beep") return (beepPlayer ??= createAudioPlayer(require("../../assets/sounds/beep.wav")));
    if (cache === "chime") return (chimePlayer ??= createAudioPlayer(require("../../assets/sounds/chime.wav")));
    return (ringPlayer ??= createAudioPlayer(require("../../assets/sounds/ring.wav")));
  } catch (e) {
    console.warn("[sound] failed to load player", cache, e);
    return null;
  }
}

async function playOnce(cache: "beep" | "chime") {
  try {
    await ensureAudioMode();
    const player = getPlayer(cache);
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn("[sound] play failed", cache, e);
  }
}

export const sound = {
  // Bid submitted successfully.
  bidSent: () => playOnce("beep"),
  // Booking status changed (on the way / arrived / working / done / confirmed).
  statusChanged: () => playOnce("chime"),
  // Starts the looping incoming-job ring; call sound.stopRing() to end it.
  startRing: async () => {
    try {
      await ensureAudioMode();
      const player = getPlayer("ring");
      if (!player) return;
      player.loop = true;
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.warn("[sound] startRing failed", e);
    }
  },
  stopRing: () => {
    try {
      ringPlayer?.pause();
    } catch {}
  },
};
