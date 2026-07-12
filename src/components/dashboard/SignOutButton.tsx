"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full rounded-[8px] border border-border-subtle px-3 py-2 text-sm font-semibold text-text-muted hover:border-danger hover:text-danger"
    >
      Log out
    </button>
  );
}
