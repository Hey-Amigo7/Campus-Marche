import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse all student listings — electronics, textbooks, clothing, and more on Campus Marche.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
