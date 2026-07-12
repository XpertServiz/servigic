import { prisma } from "@/lib/prisma";
import { sendWhatsappChannel } from "@/lib/notify/channels/whatsapp";
import { sendSmsChannel } from "@/lib/notify/channels/sms";
import { sendEmailChannel } from "@/lib/notify/channels/email";

const OTP_TTL_MINUTES = 10;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueOtp(userId: string, phone: string, purpose = "PHONE_VERIFY", email?: string | null) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { userId, code, purpose, expiresAt } });

  const title = "Servigic verification code";
  const body = `Your Servigic verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`;
  await Promise.allSettled([
    sendWhatsappChannel({ to: phone, title, body }),
    sendSmsChannel({ to: phone, body }),
    email ? sendEmailChannel({ to: email, subject: title, body }) : Promise.resolve(),
  ]);

  // Dev/local fallback: no channel is configured yet, so surface the code in
  // server logs (and only there) to keep local testing unblocked.
  const anyChannelConfigured =
    process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.TWILIO_ACCOUNT_SID || (email && process.env.RESEND_API_KEY);
  if (!anyChannelConfigured) {
    console.log(`[otp:dev-fallback] userId=${userId} code=${code}`);
  }

  return { expiresAt };
}

export async function verifyOtp(userId: string, code: string, purpose = "PHONE_VERIFY") {
  const record = await prisma.otpCode.findFirst({
    where: { userId, code, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;

  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } }),
  ]);
  return true;
}
