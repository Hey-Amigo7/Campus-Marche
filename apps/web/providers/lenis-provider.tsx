"use client";

import type { ReactNode } from "react";

// Lenis removed — it intercepted wheel events and caused scroll lag.
// Framer Motion's useScroll works fine with native browser scroll.
export function LenisProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
