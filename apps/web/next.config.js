import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const isDev = process.env.NODE_ENV !== "production";

// ── Content-Security-Policy ────────────────────────────────────────────────
// 'unsafe-inline' for script-src is required because Next.js inlines
// hydration scripts. 'unsafe-eval' is intentionally omitted.
// form-action and base-uri close the most common injection escalation paths.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
const apiWsUrl = apiUrl.replace(/^https/, "wss").replace(/^http/, "ws");

const cspDirectives = [
  "default-src 'self'",
  // Next.js inline hydration + Paystack SDK + Google Sign-In
  "script-src 'self' 'unsafe-inline' https://js.paystack.co https://accounts.google.com",
  // Tailwind inline styles + Google Fonts (Plus Jakarta Sans / Inter)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: data URIs, blobs, Supabase storage, Google profile photos, Unsplash
  "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://images.unsplash.com" +
    (isDev ? " http://localhost:*" : ""),
  // API calls + WebSocket (socket.io) + Supabase + Paystack + Google OAuth
  `connect-src 'self' ${apiUrl} ${apiWsUrl} https://*.supabase.co https://api.paystack.co https://accounts.google.com`,
  // Paystack popup + Google Sign-In popup
  "frame-src https://js.paystack.co https://accounts.google.com",
  // Block Flash, Java applets, etc.
  "object-src 'none'",
  // Prevent <base> tag hijacking
  "base-uri 'self'",
  // Prevent form exfiltration to third-party origins
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  turbopack: {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  },
  images: {
    // Restricted to known domains — was previously "**" (any HTTPS host).
    // Next.js image optimization is a proxying service; allowing arbitrary
    // origins exposes it to SSRF-like misuse.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http",  hostname: "localhost" },
    ],
  },

  async headers() {
    return [
      // Service worker must never be cached — browser must always revalidate
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy",   value: cspDirectives },
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "SAMEORIGIN" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(self)" },
          ...(isDev
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
