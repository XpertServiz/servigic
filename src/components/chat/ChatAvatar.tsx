// The chat assistant: a friendly face (soft 3D shading, blinking eyes) and a hand that waves hello. Pure SVG + CSS animation:
// no image, no library, a few KB. `waving` turns the hand animation on (it rests while the chat is open).
export function ChatAvatar({ size = 76, waving = true, className = "" }: { size?: number; waving?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Servigic assistant" className={className}>
      <defs>
        <radialGradient id="sv-face" cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffe3cc" />
          <stop offset="0.55" stopColor="#f6c4a0" />
          <stop offset="1" stopColor="#d99a72" />
        </radialGradient>
        <radialGradient id="sv-hair" cx="35%" cy="20%" r="90%">
          <stop offset="0" stopColor="#5a3a2a" />
          <stop offset="1" stopColor="#1d1210" />
        </radialGradient>
        <radialGradient id="sv-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff8a80" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff8a80" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sv-iris" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#7a4a2a" />
          <stop offset="1" stopColor="#2a1608" />
        </radialGradient>
        <linearGradient id="sv-shirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc24a" />
          <stop offset="1" stopColor="#e08e0b" />
        </linearGradient>
        <radialGradient id="sv-hand" cx="40%" cy="30%" r="85%">
          <stop offset="0" stopColor="#ffe3cc" />
          <stop offset="1" stopColor="#e2a780" />
        </radialGradient>
        <clipPath id="sv-clip">
          <circle cx="60" cy="60" r="58" />
        </clipPath>
      </defs>
      <style>{`
        .sv-blink{transform-box:fill-box;transform-origin:center;animation:sv-blink 4.6s infinite}
        .sv-wave{transform-box:fill-box;transform-origin:50% 92%;${waving ? "animation:sv-wave 1.6s ease-in-out infinite" : ""}}
        .sv-bob{transform-box:fill-box;transform-origin:center;${waving ? "animation:sv-bob 3.2s ease-in-out infinite" : ""}}
        @keyframes sv-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
        @keyframes sv-wave{0%,100%{transform:rotate(-8deg)}25%{transform:rotate(18deg)}50%{transform:rotate(-12deg)}75%{transform:rotate(16deg)}}
        @keyframes sv-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
        @media (prefers-reduced-motion: reduce){.sv-blink,.sv-wave,.sv-bob{animation:none!important}}
      `}</style>
      {/* soft backdrop disc */}
      <circle cx="60" cy="60" r="58" fill="#1c1f2b" />
      <circle cx="60" cy="60" r="58" fill="none" stroke="#ffb020" strokeOpacity="0.55" strokeWidth="2" />
      <g clipPath="url(#sv-clip)">
        <g className="sv-bob">
          {/* hair behind */}
          <path d="M22 64 Q18 22 60 18 Q102 22 98 64 Q99 92 86 108 L34 108 Q21 92 22 64 Z" fill="url(#sv-hair)" />
          {/* shoulders / top */}
          <path d="M14 122 Q18 96 46 92 L74 92 Q102 96 106 122 Z" fill="url(#sv-shirt)" />
          <path d="M46 92 L60 106 L74 92 Z" fill="#c4780a" opacity="0.55" />
          {/* neck */}
          <path d="M50 80 H70 V96 Q60 104 50 96 Z" fill="url(#sv-face)" />
          <path d="M50 88 Q60 96 70 88 V92 Q60 100 50 92 Z" fill="#c98a62" opacity="0.5" />
          {/* face */}
          <ellipse cx="60" cy="56" rx="27" ry="31" fill="url(#sv-face)" />
          {/* ears */}
          <ellipse cx="33.5" cy="58" rx="3.6" ry="6" fill="#eab08a" />
          <ellipse cx="86.5" cy="58" rx="3.6" ry="6" fill="#d79c75" />
          {/* fringe */}
          <path d="M32 50 Q34 22 62 22 Q88 22 88 50 Q80 36 64 34 Q46 34 32 50 Z" fill="url(#sv-hair)" />
          {/* eyebrows */}
          <path d="M42 45 Q48 41.5 54 44.5" stroke="#3a241a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M66 44.5 Q72 41.5 78 45" stroke="#3a241a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* eyes */}
          <g className="sv-blink">
            <ellipse cx="48" cy="54" rx="5.6" ry="6" fill="#fff" />
            <ellipse cx="72" cy="54" rx="5.6" ry="6" fill="#fff" />
            <circle cx="48.4" cy="54.4" r="3.6" fill="url(#sv-iris)" />
            <circle cx="72.4" cy="54.4" r="3.6" fill="url(#sv-iris)" />
            <circle cx="49.6" cy="52.8" r="1.2" fill="#fff" />
            <circle cx="73.6" cy="52.8" r="1.2" fill="#fff" />
          </g>
          <path d="M42 52 Q48 48.5 54 51.5 M66 51.5 Q72 48.5 78 52" stroke="#2a1810" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* nose */}
          <path d="M60 58 Q57.5 66 60.6 67.6" stroke="#c98a62" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* cheeks */}
          <circle cx="42" cy="67" r="7.5" fill="url(#sv-cheek)" />
          <circle cx="78" cy="67" r="7.5" fill="url(#sv-cheek)" />
          {/* smile */}
          <path d="M50 73 Q60 82 70 73" stroke="#b5453c" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M52.5 74.4 Q60 80.4 67.5 74.4 Q60 77.6 52.5 74.4 Z" fill="#fff" opacity="0.9" />
          {/* face shading (gives the soft 3D roundness) */}
          <ellipse cx="60" cy="56" rx="27" ry="31" fill="none" stroke="#b97a53" strokeOpacity="0.25" strokeWidth="2" />
        </g>
        {/* waving hand */}
        <g className="sv-wave">
          <path d="M84 118 Q82 96 88 90 L100 90 Q104 100 102 118 Z" fill="url(#sv-shirt)" opacity="0.001" />
          <g transform="translate(78 54)">
            <rect x="9" y="26" width="13" height="20" rx="6" fill="url(#sv-hand)" />
            <ellipse cx="15.5" cy="24" rx="11" ry="12.5" fill="url(#sv-hand)" />
            <rect x="5" y="6" width="5" height="19" rx="2.6" fill="url(#sv-hand)" />
            <rect x="11" y="2" width="5" height="21" rx="2.6" fill="url(#sv-hand)" />
            <rect x="17" y="3" width="5" height="20" rx="2.6" fill="url(#sv-hand)" />
            <rect x="23" y="7" width="4.6" height="17" rx="2.3" fill="url(#sv-hand)" />
            <path d="M6 28 Q-2 24 -1 17 Q1 14 4 17 L9 24 Z" fill="url(#sv-hand)" />
            <path d="M9 30 Q15 36 22 30" stroke="#c98a62" strokeOpacity="0.45" strokeWidth="1.4" fill="none" />
            <rect x="8" y="42" width="15" height="5" rx="2.5" fill="url(#sv-shirt)" />
          </g>
        </g>
      </g>
    </svg>
  );
}
