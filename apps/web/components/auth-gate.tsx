"use client";

import Link from "next/link";
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
  const [allowed, setAllowed] = useState(false);
  const target = mode === "register" ? "/register" : "/login";

  useEffect(() => {
    if (hasAuthToken()) {
      setAllowed(true);
      return;
    }

    router.replace(`${target}?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, target]);

  if (!allowed) {
    return (
      <div className="container-shell py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">Account required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Please {mode === "register" ? "create an account" : "log in"} before using this service.
          </p>
          <Link href={target} className="btn-primary mt-6 w-full justify-center">
            {mode === "register" ? "Create account" : "Log in"}
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
