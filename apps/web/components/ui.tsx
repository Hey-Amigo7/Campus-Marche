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
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <path d="M8 8C8 6 9 4 12 4C15 4 16 6 16 8" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 8H17V18C17 19.1 16.1 20 15 20H9C7.9 20 7 19.1 7 18V8Z" fill="url(#logoGrad)" />
          <g opacity="0.7">
            <rect x="10" y="10" width="2" height="3" fill="white" />
            <rect x="12.5" y="10" width="2" height="4" fill="white" />
          </g>
          <circle cx="19" cy="6" r="3" fill="#f59e0b" />
          <text x="19" y="7.2" textAnchor="middle" fill="white" fontSize="2.2" fontWeight="bold">₵</text>
        </svg>
      </div>
      <span className="leading-tight">
        <span className="block text-sm font-black tracking-tight">
          <span className="gradient-text">Campus</span>
          <span className="text-brand-gold"> Marche</span>
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Buy · Sell · Connect</span>
      </span>
    </Link>
  );
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SellerBadge({ verified, premium, compact = false }: { verified?: boolean; premium?: boolean; compact?: boolean }) {
  if (!verified && !premium) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
      {verified ? (
        <span className="chip chip-green">
          <BadgeCheck className="h-3.5 w-3.5" />
          Verified
        </span>
      ) : null}
      {premium ? (
        <span className="chip chip-gold">
          <Crown className="h-3.5 w-3.5" />
          Premium
        </span>
      ) : null}
    </span>
  );
}

export function FeaturedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-navy to-brand-purple px-2.5 py-1 text-xs font-bold text-white shadow-md shadow-indigo-500/30">
      <Zap className="h-3 w-3" />
      Featured
    </span>
  );
}

export function Rating({ value, reviews }: { value: number; reviews?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      {value.toFixed(1)}
      {reviews ? <span className="font-medium text-slate-500">({reviews})</span> : null}
    </span>
  );
}

export function SearchBar({ defaultValue = "", placeholder = "Search products, notes, gadgets..." }: { defaultValue?: string; placeholder?: string }) {
  return (
    <form action="/search" className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-indigo-100 bg-white px-3 shadow-sm shadow-indigo-100/50 ring-1 ring-indigo-50">
      <Search className="h-5 w-5 text-indigo-300" />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium outline-none placeholder:text-slate-400"
      />
      <button className="rounded-xl bg-gradient-to-r from-brand-navy to-brand-purple px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-300/50 hover:opacity-90">
        Search
      </button>
    </form>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-navy shadow-sm shadow-indigo-100">
          <Search className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-indigo-100 bg-white">
          <div className="h-48 animate-pulse bg-gradient-to-r from-indigo-50 to-purple-50" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-indigo-50" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-indigo-50" />
            <div className="h-8 w-full animate-pulse rounded-xl bg-indigo-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
