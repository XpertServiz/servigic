// Stroke icons lifted from the redesign mock-ups (24×24 viewBox). Shared
// verbatim by apps/customer and apps/pro.
import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { colors } from "../lib/theme";

export type IconName =
  | "home"
  | "jobs"
  | "earnings"
  | "account"
  | "bell"
  | "globe"
  | "chat"
  | "phone"
  | "back"
  | "check"
  | "warning"
  | "arrow-right"
  | "chevron-right"
  | "play"
  | "send"
  | "pin-home"
  | "clipboard";

export function Icon({
  name,
  size = 20,
  color = colors.text,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const common = { stroke: color, strokeWidth, fill: "none" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" && <Path d="M3 11l9-7 9 7M5 10v9h14v-9" {...common} />}
      {name === "jobs" && <Rect x={4} y={7} width={16} height={12} rx={2} {...common} />}
      {name === "earnings" && <Circle cx={12} cy={12} r={9} {...common} />}
      {name === "account" && (
        <>
          <Circle cx={12} cy={8} r={3.4} {...common} />
          <Path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" {...common} />
        </>
      )}
      {name === "bell" && <Path d="M12 2a6 6 0 00-6 6v4l-2 3v2h16v-2l-2-3V8a6 6 0 00-6-6z" {...common} />}
      {name === "globe" && (
        <>
          <Circle cx={12} cy={12} r={10} {...common} />
          <Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" {...common} />
        </>
      )}
      {name === "chat" && <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" {...common} />}
      {name === "phone" && (
        <Path
          d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.63 2.62a2 2 0 01-.45 2.11L8.09 9.64a16 16 0 006 6l1.2-1.2a2 2 0 012.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0122 16.92z"
          {...common}
        />
      )}
      {name === "back" && <Path d="M19 12H5M12 19l-7-7 7-7" {...common} />}
      {name === "check" && <Path d="M5 13l4 4L19 7" {...common} strokeWidth={Math.max(strokeWidth, 2.6)} />}
      {name === "warning" && (
        <>
          <Circle cx={12} cy={12} r={10} {...common} />
          <Path d="M12 8v5M12 16h.01" {...common} strokeWidth={2} />
        </>
      )}
      {name === "arrow-right" && <Path d="M5 12h14M13 6l6 6-6 6" {...common} />}
      {name === "chevron-right" && <Path d="M9 6l6 6-6 6" {...common} strokeWidth={2} />}
      {name === "play" && <Path d="M8 5v14l11-7z" fill={color} stroke="none" />}
      {name === "send" && <Path d="M5 12h14M13 6l6 6-6 6" {...common} strokeWidth={2.2} />}
      {name === "pin-home" && <Path d="M3 11l9-7 9 7M5 10v9h14v-9" {...common} strokeWidth={2.2} />}
      {name === "clipboard" && (
        <>
          <Rect x={5} y={4} width={14} height={17} rx={2} {...common} />
          <Path d="M9 9h6M9 13h6" {...common} />
        </>
      )}
    </Svg>
  );
}
