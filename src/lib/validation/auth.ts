import { z } from "zod";
import { toE164 } from "@/lib/phone";

// Registration: any country's number, validated by libphonenumber and stored
// in E.164. A number with no country code is read as Pakistani (old app
// versions and the web form).
export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => toE164(v) !== null, "Enter a valid phone number, including the country code (e.g. +923001234567)")
  .transform((v) => toE164(v) as string);

// Login: deliberately lenient. Accounts created before E.164 storage may hold
// numbers libphonenumber considers unusual, and they must still be able to log
// in; the lookup itself matches every stored variant (see phoneVariants).
export const loginPhoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9\s\-().]{7,20}$/, "Enter a valid phone number");

export const registerSchema = z.object({
  role: z.enum(["CUSTOMER", "PROVIDER"]),
  name: z.string().trim().min(2, "Name is too short").max(80),
  // Typed as the person sees it. A number without a country code is read in `country` (the visitor's country from the
  // IP, or the one picked in the form); the apps always send +country format.
  phone: z.string().trim().min(5, "Enter a valid phone number").max(30),
  country: z.string().trim().length(2).optional(),
  // Typed twice on every sign-up form to catch typos; checked here as well when a client sends it.
  confirmPassword: z.string().optional(),
  // Optional: the redesigned customer sign-up only asks for name + phone +
  // password. Providers still send one from their own sign-up form.
  email: z
    .union([z.string().trim().email("Enter a valid email address"), z.literal("")])
    .optional()
    .transform((v) => v || undefined),
  password: z.string().min(8, "Password must be at least 8 characters"),
  city: z.string().trim().min(2).optional(),
  // Referral programme: the code the new user was given, and an id for the phone (Android ID) so repeat
  // sign-ups from one device can be spotted. Both optional - the web form sends neither.
  referralCode: z.string().trim().max(20).optional(),
  deviceId: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  phone: loginPhoneSchema,
  password: z.string().min(1, "Password is required"),
  // Which app / sign-in the person is using, so a number with both a customer and a pro account opens the right one.
  role: z.enum(["CUSTOMER", "PROVIDER"]).optional(),
});

export const verifyOtpSchema = z.object({
  userId: z.string().cuid(),
  code: z.string().length(6),
});
