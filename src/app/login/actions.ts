"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { toE164 } from "@/lib/phone";

export type LoginState = { error?: string } | null;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const typed = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/post-login");
  const role = String(formData.get("role") ?? "");
  const country = String(formData.get("country") ?? "PK").toUpperCase();
  // A number typed the local way (050… in Saudi Arabia) is read in the visitor's country; one with +country is kept as is.
  const phone = toE164(typed, country as never) ?? typed;

  try {
    await signIn("credentials", { phone, password, role, redirectTo: callbackUrl });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      // The page maps this code to the visitor's language.
      return { error: "BAD_CREDENTIALS" };
    }
    throw error;
  }
}
