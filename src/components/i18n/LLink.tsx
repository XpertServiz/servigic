"use client";
import Link from "next/link";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import { localizePath } from "@/i18n/locales";

/** next/link that keeps visitors in their language on marketing pages (/pro → /de/pro). */
export function LLink({ href, ...props }: ComponentProps<typeof Link>) {
  const locale = useLocale();
  const localized = typeof href === "string" && href.startsWith("/") ? localizePath(href, locale) : href;
  return <Link href={localized} {...props} />;
}
