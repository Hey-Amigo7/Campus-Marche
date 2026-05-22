import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Enter the code sent to your email to activate your Campus Marche account.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
