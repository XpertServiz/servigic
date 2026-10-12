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
  phone: phoneSchema,
  // Optional: the redesigned customer sign-up only asks for name + phone +
  // password. Providers still send one from their own sign-up form.
  email: z
    .union([z.string().trim().email("Enter a valid email address"), z.literal("")])
    .optional()
    .transform((v) => v || undefined),
  password: z.string().min(8, "Password must be at least 8 characters"),
  city: z.string().trim().min(2).optional(),
});

export const loginSchema = z.object({
  phone: loginPhoneSchema,
  password: z.string().min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  userId: z.string().cuid(),
  code: z.string().length(6),
});
