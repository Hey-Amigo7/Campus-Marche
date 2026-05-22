import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders",
  description: "Track your campus marketplace purchases and sales.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
