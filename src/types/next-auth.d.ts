import type { Role, Language } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    phone: string;
    language: Language;
    avatarUrl?: string | null;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email?: string | null;
      role: Role;
      phone: string;
      language: Language;
      avatarUrl?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    phone: string;
    language: Language;
    avatarUrl?: string | null;
  }
}
