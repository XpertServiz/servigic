import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { findAccountsByPhone, pickAccount } from "@/lib/accounts";

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
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!phone || !password) return null;

        // A number can hold a customer and a pro account; `role` says which sign-in this is (default: customer first).
        const rawRole = String(credentials?.role ?? "").toUpperCase();
        const wanted = rawRole === "PROVIDER" ? "PROVIDER" : rawRole === "CUSTOMER" ? "CUSTOMER" : null;
        const user = await pickAccount(await findAccountsByPhone(phone), password, wanted);
        if (!user) return null;

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
