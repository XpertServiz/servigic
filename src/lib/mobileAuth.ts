import { SignJWT, jwtVerify } from "jose";
import type { Role, Language } from "@prisma/client";

const MOBILE_JWT_TTL = "30d";

function getSecret() {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret) throw new Error("MOBILE_JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export interface MobileTokenPayload {
  id: string;
  role: Role;
  phone: string;
  name: string;
  language: Language;
}

export async function issueMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(MOBILE_JWT_TTL)
    .sign(getSecret());
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.id || !payload.role || !payload.phone) return null;
    return payload as unknown as MobileTokenPayload;
  } catch {
    return null;
  }
}
