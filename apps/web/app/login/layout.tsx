import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Campus Marche account.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
