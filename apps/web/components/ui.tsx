import Link from "next/link";
import { BadgeCheck, Crown, Search, Star, Zap } from "lucide-react";
import { cn } from "@/lib/format";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Campus Marche home">
      <div className="relative flex h-9 w-9 items-center justify-center">
        <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#7FB685" />
            </linearGradient>
          </defs>
          <path d="M8 8C8 6 9 4 12 4C15 4 16 6 16 8" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 8H17V18C17 19.1 16.1 20 15 20H9C7.9 20 7 19.1 7 18V8Z" fill="url(#logoGrad)" />
          <g opacity="0.75">
            <rect x="10" y="10" width="2" height="3" fill="white" />
            <rect x="12.5" y="10" width="2" height="4" fill="white" />
          </g>
          <circle cx="19" cy="6" r="3" fill="#C68B59" />
          <text x="19" y="7.2" textAnchor="middle" fill="white" fontSize="2.2" fontWeight="bold">₵</text>
        </svg>
      </div>
      <span className="leading-tight">
        <span className="block text-sm font-extrabold tracking-tight">
          <span className="gradient-text">Campus</span>
          <span style={{ color: "#C68B59" }}> Marche</span>
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
          Buy · Sell · Connect
        </span>
      </span>
    </Link>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#1E293B] md:text-3xl">{title}</h2>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SellerBadge({
  verified,
  premium,
  compact = false,
}: {
  verified?: boolean;
  premium?: boolean;
  compact?: boolean;
}) {
  if (!verified && !premium) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
      {verified ? (
        <span className="chip chip-sage">
          <BadgeCheck className="h-3.5 w-3.5" />
          Verified
        </span>
      ) : null}
      {premium ? (
        <span className="chip chip-caramel">
          <Crown className="h-3.5 w-3.5" />
          Premium
        </span>
      ) : null}
    </span>
  );
}

export function FeaturedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-md"
      style={{ background: "linear-gradient(135deg, #0F172A, #7FB685)", boxShadow: "0 4px 12px rgba(15,23,42,0.25)" }}
    >
      <Zap className="h-3 w-3" />
      Featured
    </span>
  );
}

export function Rating({ value, reviews }: { value: number; reviews?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-[#1E293B]">
      <Star className="h-4 w-4 fill-[#C68B59] text-[#C68B59]" />
      {value.toFixed(1)}
      {reviews ? <span className="font-medium text-[#64748B]">({reviews})</span> : null}
    </span>
  );
}

export function SearchBar({
  defaultValue = "",
  placeholder = "Search products, notes, gadgets...",
}: {
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <form
      action="/search"
      className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-3"
      style={{
        border:     "1.5px solid rgba(226,232,240,0.80)",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        boxShadow:  "0 2px 10px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      <Search className="h-4.5 w-4.5 shrink-0 text-[#94A3B8]" />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-medium outline-none placeholder:text-[#94A3B8]"
      />
      <button
        className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #0F172A, #102542)" }}
      >
        Search
      </button>
    </form>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="grid min-h-72 place-items-center rounded-2xl border border-dashed p-8 text-center"
      style={{ borderColor: "rgba(127,182,133,0.30)", background: "rgba(223,243,227,0.18)" }}
    >
      <div>
        <div
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl shadow-sm"
          style={{ background: "#ffffff", color: "#7FB685", boxShadow: "0 2px 10px rgba(127,182,133,0.20)" }}
        >
          <Search className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-extrabold text-[#1E293B]">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: "rgba(226,232,240,0.70)", background: "#ffffff" }}
        >
          <div
            className="h-48 animate-pulse"
            style={{ background: "linear-gradient(90deg, #FAF7F2, #F0F7F1, #FAF7F2)" }}
          />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded" style={{ background: "#F0F7F1" }} />
            <div className="h-4 w-1/2 animate-pulse rounded" style={{ background: "#F8F5EF" }} />
            <div className="h-8 w-full animate-pulse rounded-xl" style={{ background: "#F0F7F1" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
