import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,14}$/, "Enter a valid phone number (e.g. 03001234567)");

export const registerSchema = z.object({
  role: z.enum(["CUSTOMER", "PROVIDER"]),
  name: z.string().trim().min(2, "Name is too short").max(80),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  city: z.string().trim().min(2).optional(),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  userId: z.string().cuid(),
  code: z.string().length(6),
});
