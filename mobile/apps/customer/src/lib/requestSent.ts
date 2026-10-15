// "Your request was sent" - a short spoken confirmation in the user's app language, played IN-APP only and quietly
// (it is not a push notification, so it has no channel). Falls back to English when the language has no recording.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { getAlertLanguage } from "./notifications";

// Metro needs static require() calls (customer metro.config.js adds .ogg as an asset type).
const SOURCES: Record<string, number> = {
  ur: require("../../assets/sounds/request_sent_ur.ogg"),
  en: require("../../assets/sounds/request_sent_en.ogg"),
  ar: require("../../assets/sounds/request_sent_ar.ogg"),
  hi: require("../../assets/sounds/request_sent_hi.ogg"),
  pa: require("../../assets/sounds/request_sent_pa.ogg"),
  fr: require("../../assets/sounds/request_sent_fr.ogg"),
  de: require("../../assets/sounds/request_sent_de.ogg"),
  es: require("../../assets/sounds/request_sent_es.ogg"),
};

const players: Record<string, AudioPlayer> = {};

export async function playRequestSent() {
  try {
    // Respect the silent switch; this is a courtesy sound, never an alarm.
    await setAudioModeAsync({ playsInSilentMode: false });
    const lang = SOURCES[getAlertLanguage()] ? getAlertLanguage() : "en";
    const player = (players[lang] ??= createAudioPlayer(SOURCES[lang]));
    player.volume = 0.6;
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn("[requestSent] play failed", e);
  }
}
