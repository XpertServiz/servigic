import { getLocale } from "next-intl/server";
import { getAuthContext } from "@/lib/authContext";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

// The visitor's country (from the IP, or the country switcher) decides the pre-selected country, the phone example and the
// city list, so nobody in Saudi Arabia is asked to pick Karachi.
export default async function SignupPage() {
  const ctx = await getAuthContext(await getLocale());
  return <SignupForm ctx={ctx} />;
}
