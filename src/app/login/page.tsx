import { getLocale } from "next-intl/server";
import { getAuthContext } from "@/lib/authContext";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const ctx = await getAuthContext(await getLocale());
  return <LoginForm ctx={ctx} />;
}
