// Hand-drawn vector skylines for the home-page hero, one per country: the landmarks people there recognise, in flat
// silhouette over a sunset sky. Drawn once as SVG markup (viewBox 0 0 800 300), so they cost a few KB and stay sharp on every screen.

const BOX = (x: number, w: number, h: number, win = true) => {
  const y = 300 - h;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  if (win) {
    for (let r = 0; r < Math.floor((h - 14) / 16); r++) {
      for (let c = 0; c < Math.floor((w - 8) / 12); c++) {
        if ((r * 7 + c * 3 + x) % 5 === 0) s += `<rect x="${x + 6 + c * 12}" y="${y + 10 + r * 16}" width="5" height="8" class="w"/>`;
      }
    }
  }
  return s;
};

const PALM = (x: number, h: number) =>
  `<path d="M${x} 300 Q${x + 6} ${300 - h / 2} ${x + 2} ${300 - h}" stroke="currentColor" stroke-width="4" fill="none"/>` +
  [-1, 1].flatMap((d) => [0, 1, 2].map((i) => `<path d="M${x + 2} ${300 - h} q${d * (22 + i * 8)} ${-10 + i * 9} ${d * (34 + i * 10)} ${6 + i * 16}" stroke="currentColor" stroke-width="3" fill="none"/>`)).join("");

const DOME = (cx: number, base: number, r: number) => `<path d="M${cx - r} ${base} A${r} ${r} 0 0 1 ${cx + r} ${base} Z"/><rect x="${cx - 1.5}" y="${base - r - 12}" width="3" height="12"/>`;
const MINARET = (x: number, h: number, w = 7) => `<rect x="${x}" y="${300 - h}" width="${w}" height="${h}"/><path d="M${x - 2} ${300 - h} L${x + w / 2} ${300 - h - 16} L${x + w + 2} ${300 - h} Z"/><rect x="${x - 3}" y="${300 - h * 0.62}" width="${w + 6}" height="3"/>`;

export const SKYLINES: Record<string, string> = {
  // Saudi Arabia: Kingdom Centre (with its sky bridge opening), Al Faisaliah, Burj Rafal, palms
  SA:
    BOX(40, 46, 70) + BOX(96, 34, 104) + BOX(138, 40, 82) +
    `<rect x="205" y="160" width="14" height="140"/><path d="M196 160 L212 108 L228 160 Z"/><circle cx="212" cy="104" r="15"/><rect x="211" y="52" width="2.5" height="40"/>` +
    BOX(250, 38, 120) +
    `<path fill-rule="evenodd" d="M310 300 V96 Q345 18 380 96 V300 Z M327 96 Q345 56 363 96 L363 128 L327 128 Z"/>` +
    BOX(398, 30, 96) + BOX(436, 48, 132) + `<path d="M500 300 V150 L520 70 L540 150 V300 Z"/>` + BOX(552, 40, 90) + BOX(600, 54, 66) +
    PALM(660, 64) + PALM(700, 80) + BOX(730, 50, 58),
  // Pakistan: Minar-e-Pakistan, Badshahi Mosque, Faisal Mosque, Mazar-e-Quaid
  PK:
    `<path d="M30 300 L40 262 H100 L110 300 Z"/><path d="M52 262 L58 150 H82 L88 262 Z"/><path d="M58 150 L64 96 H76 L82 150 Z"/><path d="M64 96 L70 42 L76 96 Z"/><circle cx="70" cy="36" r="6"/>` +
    BOX(130, 34, 70, false) +
    `<rect x="190" y="240" width="230" height="60"/>${DOME(250, 240, 34)}${DOME(305, 240, 46)}${DOME(360, 240, 34)}` + MINARET(184, 112) + MINARET(412, 112) +
    `<path d="M450 300 V236 H530 V300 Z"/><path d="M450 236 L490 190 L530 236 Z"/>` + MINARET(446, 126, 6) + MINARET(526, 126, 6) +
    `<path d="M560 300 V230 L610 196 L660 230 V300 Z"/>${DOME(610, 196, 30)}` + MINARET(556, 90, 6) + MINARET(656, 90, 6) +
    BOX(690, 40, 76) + BOX(738, 46, 54),
  // United Arab Emirates: Burj Khalifa, Burj Al Arab
  AE:
    BOX(30, 40, 72) + BOX(78, 36, 100) + BOX(122, 46, 80) +
    `<path d="M236 300 L248 200 L256 150 L262 110 L268 60 L272 18 L276 60 L282 110 L288 150 L296 200 L308 300 Z"/>` +
    BOX(326, 42, 130) + BOX(376, 34, 94) +
    `<path d="M440 300 V210 Q520 60 560 70 Q548 150 542 300 Z"/><path d="M452 220 Q520 120 540 110" stroke="#0a0b0f" stroke-width="3" fill="none" opacity=".45"/>` +
    BOX(590, 50, 84) + BOX(648, 38, 116) + BOX(694, 46, 70) + BOX(746, 36, 90),
  // Qatar: Aspire torch, a cylinder tower, the corniche
  QA:
    BOX(30, 48, 66) + BOX(86, 38, 96) + `<path d="M170 300 L176 130 Q166 110 178 92 Q190 74 178 56 L184 40 L190 56 Q202 74 190 92 Q202 110 192 130 L198 300 Z"/>` +
    `<rect x="250" y="120" width="52" height="180"/><path d="M250 120 Q276 84 302 120 Z"/>` + BOX(322, 36, 110) + BOX(366, 46, 80) +
    `<path d="M436 300 V160 Q470 130 504 160 V300 Z"/>` + BOX(520, 44, 96) + BOX(572, 36, 124) + BOX(616, 50, 70) + BOX(674, 40, 100) + BOX(722, 52, 60),
  // Canada: CN Tower, Rogers Centre dome
  CA:
    BOX(24, 44, 64) + BOX(76, 36, 96) + BOX(120, 48, 78) +
    `<path d="M228 300 L236 160 L240 110 L244 66 L248 8 L252 66 L256 110 L260 160 L268 300 Z"/><ellipse cx="248" cy="126" rx="26" ry="8"/><ellipse cx="248" cy="104" rx="12" ry="6"/>` +
    BOX(296, 40, 120) + BOX(346, 34, 84) + `<path d="M400 300 Q400 188 470 188 Q540 188 540 300 Z"/>` + BOX(556, 44, 104) + BOX(608, 38, 70) + BOX(654, 46, 120) + BOX(708, 40, 82) + BOX(756, 34, 56),
  // United States: Statue of Liberty, Empire State
  US:
    `<rect x="40" y="244" width="64" height="56"/><rect x="52" y="214" width="40" height="30"/><path d="M58 214 L62 130 H82 L86 214 Z"/><path d="M62 130 Q72 104 82 130 Z"/><circle cx="72" cy="94" r="12"/>` +
    `<path d="M62 86 L56 70 M67 82 L66 62 M72 80 V58 M77 82 L78 62 M82 86 L88 70" stroke="currentColor" stroke-width="3"/><path d="M84 138 L110 82 L116 84 L92 144 Z"/><path d="M106 82 Q112 60 118 82 Z"/><rect x="110" y="54" width="3" height="10"/>` +
    BOX(150, 40, 88) + BOX(198, 36, 116) + BOX(242, 46, 80) +
    `<path d="M300 300 V110 H312 V84 H322 V62 H332 V40 H338 V8 H342 V40 H348 V62 H358 V84 H368 V110 H380 V300 Z"/>` +
    BOX(396, 40, 130) + BOX(446, 34, 96) + BOX(490, 48, 140) + BOX(548, 40, 84) + BOX(596, 46, 112) + BOX(650, 38, 70) + BOX(696, 44, 100) + BOX(748, 38, 64),
  // Germany: Brandenburg Gate, Berlin TV Tower
  DE:
    BOX(24, 44, 70) + BOX(76, 40, 96) + `<rect x="150" y="150" width="300" height="12"/><rect x="146" y="140" width="308" height="12"/>` +
    [160, 200, 240, 280, 320, 360, 400].map((x) => `<rect x="${x}" y="162" width="18" height="138"/>`).join("") +
    `<rect x="190" y="110" width="220" height="30"/><path d="M270 110 H330 L322 84 H278 Z"/><path d="M286 84 L300 60 L314 84 Z"/>` +
    `<path d="M520 300 L528 150 L532 130 H540 L544 150 L552 300 Z"/><circle cx="536" cy="124" r="18"/><rect x="535" y="40" width="2.5" height="68"/>` +
    BOX(580, 44, 100) + BOX(632, 38, 70) + BOX(678, 50, 120) + BOX(736, 44, 78),
  // Anywhere else
  XX:
    BOX(24, 48, 70) + BOX(82, 40, 110) + BOX(130, 52, 84) + BOX(192, 44, 140) + BOX(246, 38, 100) + BOX(292, 54, 160) + BOX(354, 40, 96) + BOX(402, 46, 124) +
    BOX(456, 52, 80) + BOX(516, 38, 112) + BOX(562, 48, 150) + BOX(618, 40, 92) + BOX(666, 54, 120) + BOX(728, 44, 70),
};

export function skylineFor(code: string | null | undefined): string {
  return SKYLINES[(code ?? "").toUpperCase()] ?? SKYLINES.XX;
}

// Sky colours (top, middle, glow) for each country: the golden hour of the place.
export const SKY: Record<string, [string, string, string]> = {
  SA: ["#0b1030", "#3a2a5c", "#ff9a3c"],
  PK: ["#0d1b14", "#23412e", "#ffb020"],
  AE: ["#0a1226", "#1d3558", "#ffa94d"],
  QA: ["#0d0f24", "#40264f", "#ff8a5b"],
  CA: ["#0a1020", "#2a3f63", "#ffb3a0"],
  US: ["#0a0f1f", "#26324f", "#ffc36b"],
  DE: ["#0c1120", "#2c3346", "#f6a35b"],
  XX: ["#0a0b0f", "#2a2230", "#ffb020"],
};
