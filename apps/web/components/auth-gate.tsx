"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { hasAuthToken } from "@/lib/auth";

export function AuthGate({
  children,
  mode = "login",
}: {
  children: ReactNode;
  mode?: "login" | "register";
}) {
  const router = useRouter();
  const pathname = usePathname();
  // null = checking, true = authenticated, false = redirecting to login
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const target = mode === "register" ? "/register" : "/login";

  useEffect(() => {
    if (hasAuthToken()) {
      setAllowed(true);
    } else {
      setAllowed(false);
      router.replace(`${target}?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, target]);

  // Auth check in progress — render nothing to avoid a flash of the login prompt
  if (allowed === null) return null;

  // No token — redirect is already in flight, render nothing so the user
  // can't accidentally click a "Log in" button and cause a loop
  if (!allowed) return null;

  return children;
}
