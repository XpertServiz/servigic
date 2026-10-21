import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmailChannel(input: { to: string; subject: string; body: string; html?: string }) {
  if (!resend) {
    console.log(`[notify:email:noop] ${input.to} — ${input.subject}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Servigic <no-reply@servigic.com>",
    to: input.to,
    subject: input.subject,
    text: input.body,
    ...(input.html ? { html: input.html } : {}),
  });
  // Resend reports problems in the result instead of throwing: make them visible in the logs.
  if (error) console.error(`[notify:email:error] ${input.to} - ${error.name}: ${error.message}`);
}
