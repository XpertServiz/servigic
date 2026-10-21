import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { issueMobileToken } from "@/lib/mobileAuth";
import { findAccountsByPhone, pickAccount } from "@/lib/accounts";

// Mobile equivalent of the web credentials sign-in — issues a long-lived JWT
// instead of a session cookie (React Native has no first-class cookie jar
// across app restarts). Reuses the same User/passwordHash as the web app.
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid phone or password" }, { status: 400 });
  }

  const accounts = await findAccountsByPhone(parsed.data.phone);
  if (accounts.length === 0) {
    return NextResponse.json({ error: "Incorrect phone number or password" }, { status: 401 });
  }

  const user = await pickAccount(accounts, parsed.data.password, parsed.data.role ?? null);
  if (!user) {
    return NextResponse.json({ error: "Incorrect phone number or password" }, { status: 401 });
  }
  // The app asked for one role but this number only has the other: say so instead of a confusing wrong-password message.
  if (parsed.data.role && user.role !== parsed.data.role && (user.role === "CUSTOMER" || user.role === "PROVIDER")) {
    const have = user.role === "PROVIDER" ? "Pro" : "Customer";
    const want = parsed.data.role === "PROVIDER" ? "Pro" : "Customer";
    return NextResponse.json({ error: `This number is registered as a ${have}, not a ${want}. Sign up as a ${want} with the same password to use both.`, code: "WRONG_ROLE", haveRole: user.role }, { status: 403 });
  }

  const token = await issueMobileToken({
    id: user.id,
    role: user.role,
    phone: user.phone,
    name: user.name,
    language: user.language,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      language: user.language,
    },
  });
}
