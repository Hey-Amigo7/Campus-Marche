import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet",
  description: "Manage your earnings and request payouts on Campus Marche.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
