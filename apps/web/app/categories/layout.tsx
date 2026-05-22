import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse all product categories on Campus Marche.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
