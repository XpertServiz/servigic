import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  switch (session.user.role) {
    case "ADMIN":
      redirect("/admin");
    case "PROVIDER":
      redirect("/pro/dashboard");
    default:
      redirect("/dashboard");
  }
}
