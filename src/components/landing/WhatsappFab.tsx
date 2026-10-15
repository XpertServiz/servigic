export function WhatsappFab({ number }: { number?: string | null }) {
  if (!number) return null;
  const href = `https://wa.me/${number.replace(/[^\d]/g, "")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-[0_10px_30px_rgba(34,197,94,.45)] transition-transform hover:-translate-y-1 hover:scale-105"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M8 9.5h8M8 12.5h5" /></svg>
    </a>
  );
}
