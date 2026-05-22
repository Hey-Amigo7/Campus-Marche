import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
  description: "Chat with buyers and sellers on Campus Marche.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
