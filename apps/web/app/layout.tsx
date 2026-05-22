import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MobileNav, Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ToastProvider } from "@/providers/toast-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Campus Marche | HTU Student Marketplace",
    template: "%s | Campus Marche",
  },
  description:
    "Buy, sell, and connect safely with Ho Technical University students and local vendors. Ghana's trusted campus marketplace.",
  keywords: ["campus marketplace", "HTU", "Ho Technical University", "student deals", "Ghana"],
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: "Campus Marche",
    title: "Campus Marche | HTU Student Marketplace",
    description:
      "Buy, sell, and connect safely with Ho Technical University students and local vendors.",
  },
  twitter: {
    card: "summary",
    title: "Campus Marche | HTU Student Marketplace",
    description:
      "Buy, sell, and connect safely with Ho Technical University students and local vendors.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <ToastProvider>
          <Navbar />
          <main className="pb-24 md:pb-0">{children}</main>
          <Footer />
          <MobileNav />
        </ToastProvider>
      </body>
    </html>
  );
}
