// The picture behind the sign-in / sign-up card: one photo of the best-known place of the visitor's country (Karachi: the Quaid-e-Azam
// Mausoleum; the rest of Pakistan: the Faisal Mosque). A small static file from public/auth-heroes (CDN, no server work, no image
// optimizer). No slideshow. Without a picture for the country the page keeps its dark background.
/* eslint-disable @next/next/no-img-element */
export function AuthBackdrop({ hero }: { hero?: string | null }) {
  if (!hero) return null;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <img src={`/auth-heroes/${hero}.webp`} alt="" width={1080} height={1200} fetchPriority="high" className="absolute inset-x-0 top-0 h-[62vh] w-full object-cover" style={{ opacity: 0.9 }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,11,15,0.15) 0%, rgba(10,11,15,0.5) 40%, #0a0b0f 72%)" }} />
    </div>
  );
}
