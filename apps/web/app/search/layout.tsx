import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Search listings on Campus Marche by title, category, or keyword.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
