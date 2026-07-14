import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { getActiveTheme } from "@/lib/getActiveTheme";
import { RTL_LOCALES, type Locale } from "@/i18n/request";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Servigic — Post a Job. Pros Race to Bid. Fixed Today.",
  description:
    "The Uber of home services. Post your job, verified pros race to bid, your money stays safely held until the work is done.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [messages, locale, theme] = await Promise.all([
    getMessages(),
    getLocale(),
    getActiveTheme(),
  ]);
  const dir = RTL_LOCALES.includes(locale as Locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={theme}
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster theme="dark" position="top-center" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
