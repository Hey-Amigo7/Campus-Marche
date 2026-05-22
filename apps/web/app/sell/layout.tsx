import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell",
  description: "List your products and services for HTU students on Campus Marche.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
