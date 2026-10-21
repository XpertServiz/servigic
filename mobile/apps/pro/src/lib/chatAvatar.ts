// The assistant's face and waving hand as SVG strings (same artwork as the website's ChatAvatar). The face is static; the hand
// is a separate layer so the app can swing it from the wrist.
const DEFS =
  '<defs>' +
  '<radialGradient id="f" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#ffe3cc"/><stop offset="0.55" stop-color="#f6c4a0"/><stop offset="1" stop-color="#d99a72"/></radialGradient>' +
  '<radialGradient id="h" cx="35%" cy="20%" r="90%"><stop offset="0" stop-color="#5a3a2a"/><stop offset="1" stop-color="#1d1210"/></radialGradient>' +
  '<radialGradient id="c" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff8a80" stop-opacity="0.55"/><stop offset="1" stop-color="#ff8a80" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="i" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#7a4a2a"/><stop offset="1" stop-color="#2a1608"/></radialGradient>' +
  '<linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc24a"/><stop offset="1" stop-color="#e08e0b"/></linearGradient>' +
  '<radialGradient id="p" cx="40%" cy="30%" r="85%"><stop offset="0" stop-color="#ffe3cc"/><stop offset="1" stop-color="#e2a780"/></radialGradient>' +
  '<clipPath id="k"><circle cx="60" cy="60" r="58"/></clipPath>' +
  "</defs>";

export const FACE_XML =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
  DEFS +
  '<circle cx="60" cy="60" r="58" fill="#1c1f2b"/><circle cx="60" cy="60" r="58" fill="none" stroke="#ffb020" stroke-opacity="0.55" stroke-width="2"/>' +
  '<g clip-path="url(#k)">' +
  '<path d="M22 64 Q18 22 60 18 Q102 22 98 64 Q99 92 86 108 L34 108 Q21 92 22 64 Z" fill="url(#h)"/>' +
  '<path d="M14 122 Q18 96 46 92 L74 92 Q102 96 106 122 Z" fill="url(#s)"/><path d="M46 92 L60 106 L74 92 Z" fill="#c4780a" opacity="0.55"/>' +
  '<path d="M50 80 H70 V96 Q60 104 50 96 Z" fill="url(#f)"/><path d="M50 88 Q60 96 70 88 V92 Q60 100 50 92 Z" fill="#c98a62" opacity="0.5"/>' +
  '<ellipse cx="60" cy="56" rx="27" ry="31" fill="url(#f)"/><ellipse cx="33.5" cy="58" rx="3.6" ry="6" fill="#eab08a"/><ellipse cx="86.5" cy="58" rx="3.6" ry="6" fill="#d79c75"/>' +
  '<path d="M32 50 Q34 22 62 22 Q88 22 88 50 Q80 36 64 34 Q46 34 32 50 Z" fill="url(#h)"/>' +
  '<path d="M42 45 Q48 41.5 54 44.5" stroke="#3a241a" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M66 44.5 Q72 41.5 78 45" stroke="#3a241a" stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
  '<ellipse cx="48" cy="54" rx="5.6" ry="6" fill="#fff"/><ellipse cx="72" cy="54" rx="5.6" ry="6" fill="#fff"/>' +
  '<circle cx="48.4" cy="54.4" r="3.6" fill="url(#i)"/><circle cx="72.4" cy="54.4" r="3.6" fill="url(#i)"/><circle cx="49.6" cy="52.8" r="1.2" fill="#fff"/><circle cx="73.6" cy="52.8" r="1.2" fill="#fff"/>' +
  '<path d="M42 52 Q48 48.5 54 51.5 M66 51.5 Q72 48.5 78 52" stroke="#2a1810" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
  '<path d="M60 58 Q57.5 66 60.6 67.6" stroke="#c98a62" stroke-width="1.8" stroke-linecap="round" fill="none"/>' +
  '<circle cx="42" cy="67" r="7.5" fill="url(#c)"/><circle cx="78" cy="67" r="7.5" fill="url(#c)"/>' +
  '<path d="M50 73 Q60 82 70 73" stroke="#b5453c" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M52.5 74.4 Q60 80.4 67.5 74.4 Q60 77.6 52.5 74.4 Z" fill="#fff" opacity="0.9"/>' +
  "</g></svg>";

// The hand, drawn in its own 36x52 box with the wrist at the bottom centre.
export const HAND_XML =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 0 36 52">' +
  '<defs><radialGradient id="p" cx="40%" cy="30%" r="85%"><stop offset="0" stop-color="#ffe3cc"/><stop offset="1" stop-color="#e2a780"/></radialGradient>' +
  '<linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc24a"/><stop offset="1" stop-color="#e08e0b"/></linearGradient></defs>' +
  '<rect x="9" y="26" width="13" height="20" rx="6" fill="url(#p)"/><ellipse cx="15.5" cy="24" rx="11" ry="12.5" fill="url(#p)"/>' +
  '<rect x="5" y="6" width="5" height="19" rx="2.6" fill="url(#p)"/><rect x="11" y="2" width="5" height="21" rx="2.6" fill="url(#p)"/>' +
  '<rect x="17" y="3" width="5" height="20" rx="2.6" fill="url(#p)"/><rect x="23" y="7" width="4.6" height="17" rx="2.3" fill="url(#p)"/>' +
  '<path d="M6 28 Q-2 24 -1 17 Q1 14 4 17 L9 24 Z" fill="url(#p)"/><path d="M9 30 Q15 36 22 30" stroke="#c98a62" stroke-opacity="0.45" stroke-width="1.4" fill="none"/>' +
  '<rect x="8" y="42" width="15" height="5" rx="2.5" fill="url(#s)"/></svg>';
