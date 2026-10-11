// Synthesizes the six Servigic alert sounds from scratch (additive sine
// "bells" + envelopes) — original and royalty-free, not sampled from any
// other app. Output: 44.1 kHz, mono, 16-bit PCM WAV, peak-normalised near
// full scale (v1 was reported as too quiet).
//
//   node mobile/tools/generate-sounds.mjs
//
// Writes into both apps' assets/sounds folders (Metro resolves require()
// relative to each app, so the files are duplicated like the other shared
// code).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const here = dirname(fileURLToPath(import.meta.url));
const outDirs = ["../apps/customer/assets/sounds", "../apps/pro/assets/sounds"].map((p) => join(here, p));

function buffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SR));
}

// One bell-like note mixed into `buf` at `start` seconds.
// partials: [ratio, amplitude] pairs; decay: seconds for the envelope to fall ~60 dB.
function note(buf, { start, freq, dur, gain = 1, partials = [[1, 1], [2, 0.42], [3, 0.18], [4.2, 0.08]], decay = 0.35, attack = 0.004 }) {
  const startIdx = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  for (let i = 0; i < n && startIdx + i < buf.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.exp((-6.9 * t) / decay) * (i > n - 0.01 * SR ? (n - i) / (0.01 * SR) : 1);
    let s = 0;
    for (const [ratio, amp] of partials) s += amp * Math.sin(2 * Math.PI * freq * ratio * t);
    buf[startIdx + i] += s * env * gain;
  }
}

function finish(buf, peak = 0.97) {
  // Gentle tanh saturation adds perceived loudness without harsh clipping,
  // then normalise the peak close to full scale.
  let max = 0;
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.tanh(buf[i] * 1.6);
    max = Math.max(max, Math.abs(buf[i]));
  }
  const scale = max > 0 ? peak / max : 1;
  const pcm = Buffer.alloc(44 + buf.length * 2);
  pcm.write("RIFF", 0);
  pcm.writeUInt32LE(36 + buf.length * 2, 4);
  pcm.write("WAVE", 8);
  pcm.write("fmt ", 12);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(SR, 24);
  pcm.writeUInt32LE(SR * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36);
  pcm.writeUInt32LE(buf.length * 2, 40);
  for (let i = 0; i < buf.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * scale)) * 32767), 44 + i * 2);
  return pcm;
}

const sounds = {};

// new_job_alert — repeating "incoming call" ring: a two-note chime, four
// times over 5.6 s. Bright, loud, hard to miss in a pocket or toolbag.
{
  const b = buffer(5.6);
  for (let rep = 0; rep < 4; rep++) {
    const t0 = rep * 1.4;
    note(b, { start: t0, freq: 988, dur: 0.55, gain: 1, decay: 0.28 });
    note(b, { start: t0 + 0.2, freq: 1319, dur: 0.75, gain: 1, decay: 0.34 });
    note(b, { start: t0 + 0.4, freq: 988, dur: 0.5, gain: 0.55, decay: 0.24 });
  }
  sounds.new_job_alert = b;
}

// bid_accepted — cheerful 4-note ascending success arpeggio (~0.6 s).
{
  const b = buffer(0.7);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(b, { start: i * 0.11, freq: f, dur: i === 3 ? 0.3 : 0.2, decay: i === 3 ? 0.2 : 0.14 }));
  sounds.bid_accepted = b;
}

// message_received — short single pop, lighter than the alert sounds (~0.3 s).
{
  const b = buffer(0.32);
  const n = Math.floor(0.3 * SR);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 600 + 380 * Math.exp(-t * 28); // quick downward pitch bend = "pop"
    phase += (2 * Math.PI * f) / SR;
    b[i] += Math.sin(phase) * Math.exp(-t * 16) * Math.min(1, t / 0.002);
  }
  sounds.message_received = b;
}

// job_status_update — one soft ding (~0.4 s).
{
  const b = buffer(0.45);
  note(b, { start: 0, freq: 880, dur: 0.42, gain: 0.9, decay: 0.2, partials: [[1, 1], [2.01, 0.25], [3, 0.08]] });
  sounds.job_status_update = b;
}

// job_done — 3-note ascending resolving phrase (~0.75 s).
{
  const b = buffer(0.85);
  [659.25, 783.99, 1046.5].forEach((f, i) => note(b, { start: i * 0.15, freq: f, dur: i === 2 ? 0.5 : 0.22, decay: i === 2 ? 0.3 : 0.16 }));
  sounds.job_done = b;
}

// payment_added — bright two-tone "cha-ching" (~0.35 s) with metallic partials.
{
  const b = buffer(0.42);
  const metallic = [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.1]];
  note(b, { start: 0, freq: 1318.5, dur: 0.12, partials: metallic, decay: 0.08 });
  note(b, { start: 0.09, freq: 1975.5, dur: 0.32, partials: metallic, decay: 0.18 });
  sounds.payment_added = b;
}

for (const dir of outDirs) {
  mkdirSync(dir, { recursive: true });
  for (const [name, buf] of Object.entries(sounds)) writeFileSync(join(dir, `${name}.wav`), finish(buf));
}
console.log("Wrote", Object.keys(sounds).length, "sounds to", outDirs.length, "apps");
