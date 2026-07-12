// Strips phone numbers, emails, and WhatsApp mentions from free-text before
// it's persisted (bid messages, chat) — stops off-platform deals pre-payment.
const CONTACT_PATTERN =
  /\+?\d[\d\s\-./\\#]{5,}\d|[\w.-]+@[\w.-]+\.[a-z]{2,}|\bwhats\s?app\b/gi;

export function scrubContactInfo(text: string): string {
  return text.replace(CONTACT_PATTERN, "[contact details unlock after payment]");
}
