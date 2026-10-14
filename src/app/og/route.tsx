import { ImageResponse } from "next/og";

// Social-share card (1200×630) used by every page's Open Graph / Twitter tags.
// Brand-only text, so it renders identically for every language.
export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "70px 90px",
          background: "radial-gradient(ellipse 70% 90% at 15% 0%, #3a2706 0%, #0a0b0f 62%)",
          color: "#f5f5f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: "#ffb020", textTransform: "uppercase" }}>Home services · Pakistan</div>
          <div style={{ display: "flex", fontSize: 112, fontWeight: 800, letterSpacing: -4, marginTop: 18 }}>Servigic</div>
          <div style={{ display: "flex", fontSize: 44, color: "#c7cad4", marginTop: 14, lineHeight: 1.25 }}>Post a job. Verified pros race to bid. Fixed today.</div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 330, height: 330, alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 330, height: 330, borderRadius: 330, background: "radial-gradient(closest-side, rgba(255,176,32,0.35), rgba(255,176,32,0))" }} />
          <div style={{ display: "flex", fontSize: 300, fontWeight: 800, color: "#ffb020", lineHeight: 1 }}>S</div>
          <div style={{ position: "absolute", top: 36, right: 34, width: 56, height: 56, borderRadius: 56, background: "#ef4444", boxShadow: "0 0 40px rgba(239,68,68,0.9)" }} />
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } },
  );
}
