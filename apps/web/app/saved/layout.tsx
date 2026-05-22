import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Items",
  description: "Your bookmarked products on Campus Marche.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
