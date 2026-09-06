import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ConditionalShell } from "@/components/conditional-shell";
import { SystemStatusBanner } from "@/components/system-status-banner";
import { ToastProvider } from "@/providers/toast-provider";
import { CartProvider } from "@/providers/cart-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { LenisProvider } from "@/providers/lenis-provider";
import { GoogleProvider } from "@/providers/google-provider";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstall } from "@/components/pwa-install";
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

export const viewport: Viewport = {
  themeColor: "#223A6A",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Campus Marche",
    template: "%s | Campus Marche",
  },
  description:
    "Buy, sell, and connect safely with Ho Technical University students and local vendors. Ghana's trusted campus marketplace.",
  keywords: ["campus marketplace", "HTU", "Ho Technical University", "student deals", "Ghana"],
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: "Campus Marche",
    title: "Campus Marche",
    description:
      "Buy, sell, and connect safely with Ho Technical University students and local vendors.",
  },
  twitter: {
    card: "summary",
    title: "Campus Marche",
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
      <head>
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://oauth2.googleapis.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
      </head>
      <body className="min-h-full font-sans">
        <PwaRegister />
        <PwaInstall />
        <GoogleProvider>
          <LenisProvider>
            <ThemeProvider>
              <ToastProvider>
                <CartProvider>
                  <SystemStatusBanner />
                  <ConditionalShell>{children}</ConditionalShell>
                </CartProvider>
              </ToastProvider>
            </ThemeProvider>
          </LenisProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
