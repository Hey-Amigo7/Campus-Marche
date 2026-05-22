import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your activity notifications on Campus Marche.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
