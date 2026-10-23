// Turns a sign-up / sign-in / reset failure into a clear message in the user's language, using the server's error `code`.
// A number or email that is already registered says WHERE (customer or pro), so nobody is left guessing.
// Shared verbatim by apps/customer and apps/pro.
import { ApiError } from "./api";
import type { TFunction } from "./i18n";

const roleWord = (t: TFunction, role: unknown) => (role === "PROVIDER" ? t("auth.rolePro") : t("auth.roleCustomer"));

export function authErrorMessage(e: unknown, t: TFunction, wantRole: "CUSTOMER" | "PROVIDER", fallbackKey: "auth.signupFailed" | "auth.loginFailed" = "auth.signupFailed"): string {
  if (e instanceof ApiError) {
    const existing = e.data.existingRole ?? e.data.haveRole;
    switch (e.code) {
      case "PHONE_EXISTS_SAME_ROLE":
        return t("auth.errPhoneExistsSame", { role: roleWord(t, existing) });
      case "PHONE_EXISTS_OTHER_ROLE":
        return t("auth.errPhoneExistsOther", { role: roleWord(t, existing), want: roleWord(t, wantRole) });
      case "EMAIL_EXISTS":
        return t("auth.errEmailExists", { role: roleWord(t, wantRole) });
      case "INVALID_PHONE":
        return t("auth.errInvalidPhone");
      case "RATE_LIMITED":
        return t("auth.errRateLimited");
      case "PASSWORD_MISMATCH":
        return t("auth.passwordMismatch");
      case "SERVER_ERROR":
        return t("auth.errServer");
      case "TERMS_REQUIRED":
      case "TERMS_OUTDATED":
        return t("legal.required");
      case "BAD_CODE":
        return t("auth.resetBadCode");
      case "WRONG_ROLE":
        return t("auth.wrongRole", { have: roleWord(t, existing), want: roleWord(t, wantRole) });
      default:
        return e.message || t(fallbackKey);
    }
  }
  return e instanceof Error ? e.message : t(fallbackKey);
}
