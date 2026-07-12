// Real SMS delivery via Twilio (global, self-serve signup — easiest to get
// working today; a cheaper local Pakistan gateway per Master Brief §8 can
// replace this later without touching any caller, since callers only see
// sendSmsChannel({ to, body })).
export async function sendSmsChannel(input: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[notify:sms:noop] ${input.to} — ${input.body}`);
    return;
  }

  const toE164 = input.to.startsWith("+") ? input.to : `+92${input.to.replace(/^0/, "")}`; // Pakistani numbers default to +92

  const body = new URLSearchParams({ To: toE164, From: fromNumber, Body: input.body });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`[notify:sms:error] ${res.status} — ${error}`);
  }
}
