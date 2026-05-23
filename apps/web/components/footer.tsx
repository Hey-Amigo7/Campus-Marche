"use client";

import Link from "next/link";
import { Logo } from "@/components/ui";

export function Footer() {
  return (
    <footer style={{ background: "#1a0a2e" }} className="text-slate-100">
      <div className="container-shell grid gap-12 py-14 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
        <div className="space-y-5">
          <Logo />
          <p className="max-w-md text-sm leading-6 text-slate-300">
            A calmer, safer marketplace for students to buy what they need and sell what they do not.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary">
              Browse Marketplace
            </Link>
            <Link href="/sell" className="btn-secondary border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10">
              Sell an Item
            </Link>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">Marketplace</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <Link href="/products" className="block hover:text-pink-300 transition-colors">Browse products</Link>
              <Link href="/sell" className="block hover:text-pink-300 transition-colors">Sell an item</Link>
              <Link href="/events" className="block hover:text-pink-300 transition-colors">Campus events</Link>
              <Link href="/trust" className="block hover:text-pink-300 transition-colors">Campus safety</Link>
              <Link href="/deals" className="block hover:text-pink-300 transition-colors">Student deals</Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">Company</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <Link href="/about" className="block hover:text-sky-300 transition-colors">About</Link>
              <Link href="/contact" className="block hover:text-sky-300 transition-colors">Contact</Link>
              <Link href="/careers" className="block hover:text-sky-300 transition-colors">Careers</Link>
              <Link href="/press" className="block hover:text-sky-300 transition-colors">Press</Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">Support</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <Link href="/help" className="block hover:text-violet-300 transition-colors">Help center</Link>
              <Link href="/trust" className="block hover:text-violet-300 transition-colors">Trust & safety</Link>
              <Link href="/terms" className="block hover:text-violet-300 transition-colors">Terms</Link>
              <Link href="/privacy" className="block hover:text-violet-300 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 py-5" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="container-shell flex flex-col items-center justify-between gap-3 text-sm text-slate-400 sm:flex-row">
          <p>© 2026 Campus Marche. Built for students, by students.</p>
          <p>Secure meetups. Local listings. No campus clutter.</p>
        </div>
      </div>
    </footer>
  );
}
