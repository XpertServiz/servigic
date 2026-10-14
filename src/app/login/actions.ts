"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export type LoginState = { error?: string } | null;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/post-login");

  try {
    await signIn("credentials", { phone, password, redirectTo: callbackUrl });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      // The page maps this code to the visitor's language.
      return { error: "BAD_CREDENTIALS" };
    }
    throw error;
  }
}
