import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { issueOtp } from "@/lib/otp";
import { toE164 } from "@/lib/phone";
import { attachReferral } from "@/lib/referrals";
import { syncLeadForUser } from "@/lib/leads";
import { findAccountsByPhone, passwordMatchesAny, roleLabel } from "@/lib/accounts";
import { checkRateLimit } from "@/lib/rateLimit";
import { getAgreement } from "@/lib/legal/agreements";
import { cityForAccount } from "@/lib/userCountry";
import { agreementCountry, checkAcceptance, recordAcceptance } from "@/lib/legal/acceptance";

// Every failure answers with JSON { error, code }: the web form and the apps show `error` (or translate `code`), never a
// generic "network error" for something we can explain (a number or email that is already registered, a bad number).
const fail = (error: string, code: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error, code, ...extra }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input", "INVALID_INPUT", 400);
  }
  const { role, name, email, password, referralCode, deviceId, country, confirmPassword, terms } = parsed.data;
  let city = parsed.data.city;

  if (confirmPassword !== undefined && confirmPassword !== password) return fail("The two passwords do not match.", "PASSWORD_MISMATCH", 400);
  // A number typed without +country is read in the visitor's country (IP / form), then in Pakistan.
  const phone = toE164(parsed.data.phone, ((country ?? "PK").toUpperCase() as never) ?? "PK");
  if (!phone) return fail("Enter a valid phone number, including the country code (e.g. +966 50 123 4567).", "INVALID_PHONE", 400);

  // The phone number's country decides the account's country: a Saudi number registered from Pakistan is a Saudi account.
  city = (await cityForAccount({ city: city ?? null, phone }, { preferPhone: true })) ?? city;

  // The Customer Terms / Pro Agreement of the user's country must be accepted and e-signed before any account is made.
  const agreement = getAgreement(role, await agreementCountry({ city, phone }, country));
  const termsProblem = checkAcceptance(terms, agreement);
  if (termsProblem) return fail(termsProblem, terms ? "TERMS_OUTDATED" : "TERMS_REQUIRED", 400, { agreement: { version: agreement.version, hash: agreement.hash, country: agreement.country } });
  const signTerms = (userId: string) =>
    recordAcceptance({ userId, role, agreement, input: terms!, source: req.headers.get("x-servigic-client") === "app" || deviceId ? "app" : "web" }).catch((e) => console.error("[terms]", e));

  const limited = await checkRateLimit(`register:${phone}`, 8, 60 * 60);
  if (!limited.ok) return fail("Too many attempts. Please try again in a while.", "RATE_LIMITED", 429);

  const accounts = await findAccountsByPhone(phone);
  const same = accounts.find((u) => u.role === role);
  const other = accounts.find((u) => u.role !== role && (u.role === "CUSTOMER" || u.role === "PROVIDER"));

  if (same) {
    // An admin posted jobs for this number before the customer had the app: this registration claims that
    // account (so the job history carries over) once the phone code is verified — see verifyOtp().
    if (same.managedByAdmin && same.role === "CUSTOMER" && role === "CUSTOMER") {
      if (email) {
        const emailTaken = await prisma.user.findFirst({ where: { email, role, id: { not: same.id } }, select: { id: true } });
        if (emailTaken) return fail("An account with this email already exists", "EMAIL_EXISTS", 409);
      }
      await prisma.user.update({
        where: { id: same.id },
        data: { pendingPasswordHash: await bcrypt.hash(password, 12), pendingName: name, pendingEmail: email ?? null, city: same.city ?? city },
      });
      await signTerms(same.id);
      await issueOtp(same.id, same.phone, "PHONE_VERIFY", email);
      return NextResponse.json({ userId: same.id, phone: same.phone });
    }
    return fail(`This phone number is already registered as a ${roleLabel(role)}. Please log in instead, or use "Forgot password" if you do not remember it.`, "PHONE_EXISTS_SAME_ROLE", 409, { existingRole: same.role });
  }

  // The same person adding the other role (a pro who also wants to hire, a customer who also wants to work): allowed when the
  // password typed is the existing account's password, which proves it is the same person. Otherwise tell them exactly what to do.
  let linkedFrom: (typeof accounts)[number] | null = null;
  if (other) {
    linkedFrom = await passwordMatchesAny(accounts, password);
    if (!linkedFrom) {
      return fail(
        `This number already has a ${roleLabel(other.role)} account. To also use it as a ${roleLabel(role)}, enter the SAME password as your ${roleLabel(other.role)} account, or log in to your ${roleLabel(other.role)} account.`,
        "PHONE_EXISTS_OTHER_ROLE",
        409,
        { existingRole: other.role },
      );
    }
  }

  if (email) {
    const emailTaken = await prisma.user.findFirst({ where: { email, role }, select: { id: true } });
    if (emailTaken) {
      return fail(`This email is already used by another ${roleLabel(role)} account. Use a different email, or log in.`, "EMAIL_EXISTS", 409, { existingRole: role });
    }
  }

  const passwordHash = linkedFrom ? linkedFrom.passwordHash : await bcrypt.hash(password, 12);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        role,
        name,
        phone: linkedFrom ? linkedFrom.phone : phone,
        email,
        passwordHash,
        city,
        // Linking a second role to a number that was already verified needs no second code.
        phoneVerified: linkedFrom ? linkedFrom.phoneVerified : false,
        ...(linkedFrom ? { language: linkedFrom.language } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = JSON.stringify(e.meta?.target ?? "");
      if (target.includes("email")) return fail(`This email is already used by another ${roleLabel(role)} account. Use a different email, or log in.`, "EMAIL_EXISTS", 409);
      return fail(`This phone number is already registered as a ${roleLabel(role)}. Please log in instead.`, "PHONE_EXISTS_SAME_ROLE", 409);
    }
    console.error("[register]", e);
    return fail("Something went wrong on our side. Please try again in a moment.", "SERVER_ERROR", 500);
  }

  await signTerms(user.id);

  if (role === "PROVIDER") {
    await prisma.providerProfile.create({
      data: { userId: user.id, displayName: name },
    });
  }

  // Referral code + device check. A bad code or a blocked (abusive) referral never stops the sign-up itself.
  const referral = await attachReferral({ newUserId: user.id, role, phone: user.phone, code: referralCode, deviceId }).catch(() => ({ status: "invalid" as const }));

  // Pro CRM: this phone may already be a lead; either way he is now a registered Pro. A Pro who came in through another
  // Pro's referral code is recorded as a Pro referral.
  if (role === "PROVIDER") {
    const byPro = referral.status === "applied" ? await prisma.referral.findFirst({ where: { referredUserId: user.id, referrerRole: "PROVIDER" }, select: { id: true } }).catch(() => null) : null;
    await syncLeadForUser(user.id, "REGISTERED", byPro ? "PRO_REFERRAL" : "APP").catch((e) => console.error("[leads]", e));
  }

  // A number that is already verified (second role) goes straight to sign-in; everyone else gets a code. A code that cannot be
  // delivered never turns the whole sign-up into an error: the person can ask for it again on the next screen.
  const verified = Boolean(linkedFrom?.phoneVerified);
  if (!verified) await issueOtp(user.id, user.phone, "PHONE_VERIFY", user.email).catch((e) => console.error("[otp]", e));

  // Only "applied" / "invalid" are told to the app; a rejection looks like "no referral" so abusers learn nothing.
  return NextResponse.json({
    userId: user.id,
    phone: user.phone,
    verified,
    linked: Boolean(linkedFrom),
    referral: referral.status === "applied" ? "applied" : referralCode ? "invalid" : "none",
  });
}
