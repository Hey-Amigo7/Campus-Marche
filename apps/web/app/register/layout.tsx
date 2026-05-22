import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join Campus Marche — the HTU student marketplace.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
