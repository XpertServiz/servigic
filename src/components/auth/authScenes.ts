// Line-art scenes of the trades Servigic connects people with (plumber, electrician, carpenter, AC technician, painter).
// They fade in and out, very softly, behind the sign-in and sign-up cards. One SVG string per scene, viewBox 0 0 400 300,
// drawn with currentColor so the page decides the tint. The same strings are used in the Customer and Pro apps (SvgXml).
const OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">';
const CLOSE = "</svg>";

export const AUTH_SCENES: { key: string; svg: string }[] = [
  {
    key: "plumber",
    svg:
      OPEN +
      // pipe run with an elbow and a joint
      '<path d="M30 200 H220 Q250 200 250 230 V280"/><path d="M30 232 H208 Q218 232 218 242 V280"/><rect x="118" y="190" width="14" height="52" rx="3"/><rect x="236" y="262" width="28" height="12" rx="3"/>' +
      // pipe wrench
      '<path d="M270 70 L340 140"/><path d="M285 56 L355 126"/><path d="M270 70 Q250 44 276 28 Q292 22 300 36 L286 46 L292 56 L306 54 Q316 72 300 84 Q286 92 270 70 Z"/><path d="M340 140 L352 128 L368 144 Q372 154 362 158 L350 152 Z"/>' +
      // water drops
      '<path d="M160 244 Q150 262 160 270 Q170 262 160 244 Z"/><path d="M178 256 Q172 266 178 272 Q184 266 178 256 Z"/>' +
      CLOSE,
  },
  {
    key: "electrician",
    svg:
      OPEN +
      // light bulb
      '<path d="M120 150 Q86 118 100 82 Q116 46 150 46 Q184 46 200 82 Q214 118 180 150 Q168 162 168 178 H132 Q132 162 120 150 Z"/><path d="M132 192 H168 M138 206 H162 M144 220 H156"/><path d="M150 46 V20 M96 70 L78 56 M204 70 L222 56 M84 112 L62 118 M216 112 L238 118" stroke-width="2.5"/>' +
      // wire + plug + socket
      '<path d="M250 220 Q300 220 300 180 Q300 150 330 150 H372"/><rect x="236" y="206" width="30" height="28" rx="6"/><path d="M244 206 V194 M258 206 V194"/><rect x="330" y="120" width="52" height="64" rx="10"/><circle cx="348" cy="146" r="4"/><circle cx="364" cy="146" r="4"/><path d="M356 162 V172"/>' +
      '<path d="M40 250 L70 230 L56 232 L84 206" stroke-width="2.5"/>' +
      CLOSE,
  },
  {
    key: "carpenter",
    svg:
      OPEN +
      // plank with grain
      '<rect x="40" y="206" width="300" height="46" rx="4"/><path d="M62 222 Q120 214 180 224 T310 220 M56 238 Q130 232 200 240 T320 236" stroke-width="2"/><circle cx="260" cy="228" r="7"/>' +
      // hammer
      '<path d="M96 170 L170 96"/><path d="M108 182 L182 108"/><path d="M150 76 L198 52 L226 96 L180 122 Z"/><path d="M198 52 L212 36 L240 80 L226 96"/>' +
      // saw
      '<path d="M250 150 L330 90 L346 110 L270 172 Z"/><path d="M270 172 L262 184 L240 168 L250 150"/><path d="M256 168 l6 -4 l-2 8 l6 -4 l-2 8 l6 -4" stroke-width="2"/>' +
      CLOSE,
  },
  {
    key: "ac",
    svg:
      OPEN +
      // split AC unit
      '<rect x="40" y="70" width="240" height="76" rx="14"/><path d="M60 118 H260 M60 130 H260" stroke-width="2.5"/><circle cx="256" cy="92" r="5"/><path d="M90 150 Q86 176 76 190 M150 150 Q146 184 136 202 M210 150 Q206 176 196 192" stroke-width="2.5"/>' +
      // snowflakes
      '<path d="M330 80 V140 M304 95 L356 125 M304 125 L356 95" /><path d="M318 80 L330 92 L342 80 M318 140 L330 128 L342 140" stroke-width="2.5"/>' +
      '<path d="M340 220 V252 M324 228 L356 244 M324 244 L356 228" stroke-width="2.5"/><path d="M110 236 L170 236 M130 218 L170 218" stroke-width="2.5"/>' +
      // screwdriver
      '<path d="M200 260 L250 210"/><path d="M250 210 L268 192 L278 202 L262 220 Z"/>' +
      CLOSE,
  },
  {
    key: "painter",
    svg:
      OPEN +
      // wall with fresh stripe
      '<rect x="30" y="40" width="250" height="200" rx="6"/><path d="M54 80 H256 M54 112 H256" stroke-width="2" /><path d="M54 150 Q150 138 256 152 V190 Q150 200 54 188 Z"/>' +
      // roller
      '<rect x="206" y="214" width="124" height="38" rx="12"/><path d="M330 232 H356 Q372 232 372 218 V196 H310 V182"/><path d="M310 182 V160"/><rect x="298" y="132" width="24" height="30" rx="5"/>' +
      // paint drip + brush
      '<path d="M90 190 V214 Q90 222 98 222 Q106 222 106 214 V196" stroke-width="2.5"/><path d="M40 270 L100 250 L110 262 L52 284 Z"/><path d="M100 250 L124 228 L134 240 L110 262"/>' +
      CLOSE,
  },
];
