import type { NextAuthConfig } from "next-auth";
import type { Role, Language } from "@prisma/client";

// Edge-safe config: no Prisma, no providers. Consumed by proxy.ts so the
// Edge runtime bundle never pulls in the Prisma client (Prisma can't run on Edge).
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
        token.language = user.language;
        token.avatarUrl = user.avatarUrl;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.phone = token.phone as string;
      session.user.language = token.language as Language;
      session.user.avatarUrl = token.avatarUrl as string | null | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
