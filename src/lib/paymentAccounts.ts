import { prisma } from "@/lib/prisma";

export interface PaymentAccounts {
  JAZZCASH?: { title?: string; number: string };
  EASYPAISA?: { title?: string; number: string };
  BANK_TRANSFER?: { bankName?: string; title?: string; number: string };
}

// Placeholder numbers (0300-0000000, 0000-0000000000-00) must never be shown to pros: anything empty, all zeros,
// or ending in seven or more zeros is treated as "not set".
const real = (v: string | null | undefined): string | undefined => {
  const t = (v ?? "").trim();
  const digits = t.replace(/\D/g, "");
  return t && digits && !/0{7,}$/.test(digits) ? t : undefined;
};

/** The accounts a pro can send a wallet top-up to: Admin > Settings first, the NEXT_PUBLIC_* environment values as fallback. */
export async function getPaymentAccounts(): Promise<PaymentAccounts> {
  const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const jazz = real(s?.payJazzcashNumber) ?? real(process.env.NEXT_PUBLIC_JAZZCASH_NUMBER);
  const easy = real(s?.payEasypaisaNumber) ?? real(process.env.NEXT_PUBLIC_EASYPAISA_NUMBER);
  const bank = real(s?.payBankAccountNumber) ?? real(process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER);
  const title = s?.payBankAccountTitle || process.env.NEXT_PUBLIC_BANK_ACCOUNT_TITLE || undefined;
  return {
    ...(jazz ? { JAZZCASH: { title: s?.payJazzcashTitle || title, number: jazz } } : {}),
    ...(easy ? { EASYPAISA: { title: s?.payEasypaisaTitle || title, number: easy } } : {}),
    ...(bank ? { BANK_TRANSFER: { bankName: s?.payBankName || process.env.NEXT_PUBLIC_BANK_NAME || undefined, title, number: bank } } : {}),
  };
}
