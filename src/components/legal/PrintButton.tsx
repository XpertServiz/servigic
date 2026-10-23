"use client";

/** Opens the browser's print dialog, where the page can be printed or saved as a PDF. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground print:hidden">
      {label}
    </button>
  );
}
