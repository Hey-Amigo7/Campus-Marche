import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ConditionalShell } from "@/components/conditional-shell";
import { SystemStatusBanner } from "@/components/system-status-banner";
import { ToastProvider } from "@/providers/toast-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { LenisProvider } from "@/providers/lenis-provider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${plusJakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <LenisProvider>
          <ThemeProvider>
            <ToastProvider>
              <SystemStatusBanner />
              <ConditionalShell>{children}</ConditionalShell>
            </ToastProvider>
          </ThemeProvider>
        </LenisProvider>
      </body>
    </html>
  );
}
