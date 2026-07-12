import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

// Full config: adds the Credentials provider + Prisma lookup on top of the
// edge-safe authConfig. Used by server components, API routes, and server actions.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!phone || !password) return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          language: user.language,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
});
