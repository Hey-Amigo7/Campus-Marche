import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="glass-card max-w-sm w-full p-10 flex flex-col items-center gap-6">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "rgba(34,58,106,0.12)" }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#223A6A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[--on-surface] mb-2">
            You&rsquo;re offline
          </h1>
          <p className="text-sm text-[--on-surface-muted] leading-relaxed">
            Campus Marche needs a connection for live listings, orders, and
            payments. Check your network and try again.
          </p>
        </div>

        <Link
          href="/"
          className="btn-primary w-full text-center py-3 rounded-xl text-sm font-semibold"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
