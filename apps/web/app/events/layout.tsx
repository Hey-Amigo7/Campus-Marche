import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campus Events",
  description: "Discover events, opportunities, and activities around Ho Technical University.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
