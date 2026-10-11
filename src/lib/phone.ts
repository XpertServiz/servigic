// Pakistani mobile numbers have been stored in whichever format the user typed
// ("03001234567", "+923001234567", ...) because nothing normalized them. The
// redesigned mobile apps now send the local 11-digit format, so lookups must
// match the same number however it was originally saved.
export function phoneVariants(input: string): string[] {
  const raw = input.trim();
  const compact = raw.replace(/[\s\-()]/g, "");
  const match = compact.match(/^(?:\+92|0092|92|0)(3\d{9})$/);
  if (!match) return [raw];
  const national = match[1];
  return Array.from(new Set([raw, `0${national}`, `+92${national}`, `92${national}`, `0092${national}`]));
}
