// Accepts a bare video ID or any common YouTube URL shape (watch, youtu.be,
// shorts, embed) and returns just the 11-char video ID, or null if it
// doesn't look like a YouTube reference at all.
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1) || null;
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const shortsMatch = url.pathname.match(/^\/(shorts|embed)\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[2];
    }
  } catch {
    return null;
  }
  return null;
}

// YouTube always serves hqdefault.jpg for any uploaded video (unlike
// maxresdefault, which only exists for HD sources) — safe default thumbnail
// with no extra fetch/availability check needed.
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
