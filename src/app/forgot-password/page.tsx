import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getAuthContext } from "@/lib/authContext";
import { ForgotForm } from "./ForgotForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ForgotPasswordPage() {
  const ctx = await getAuthContext(await getLocale());
  return <ForgotForm ctx={ctx} />;
}
