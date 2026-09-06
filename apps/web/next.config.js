import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const isDev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  turbopack: {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
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
          // Prevent browsers from sniffing content type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Disallow embedding in iframes from other origins
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop referrer leaking across origins
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict browser features
          // geolocation=(self) — delivery tracking uses navigator.geolocation
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          // HSTS — only active in production (dev uses http)
          ...(isDev
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
