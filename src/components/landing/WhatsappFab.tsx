export function WhatsappFab({ number }: { number?: string | null }) {
  if (!number) return null;
  const href = `https://wa.me/${number.replace(/[^\d]/g, "")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp support"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-2xl font-extrabold text-secondary-foreground shadow-[0_8px_24px_rgba(34,197,94,.4)]"
    >
      💬
    </a>
  );
}
