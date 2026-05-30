"use client";

import { usePathname } from "next/navigation";
import { Navbar, MobileNav } from "@/components/navbar";
import { Footer } from "@/components/footer";
import type { ReactNode } from "react";

export function ConditionalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main className="pb-24 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
}
