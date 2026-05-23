"use client";

import Link from "next/link";
import { Logo } from "@/components/ui";

const COLS = [
  {
    heading: "Marketplace",
    color:   "#A8D4AE",
    links: [
      { href: "/products",  label: "Browse products"  },
      { href: "/sell",      label: "Sell an item"     },
      { href: "/events",    label: "Campus events"    },
      { href: "/trust",     label: "Campus safety"    },
      { href: "/deals",     label: "Student deals"    },
    ],
  },
  {
    heading: "Company",
    color:   "#A8D4AE",
    links: [
      { href: "/about",    label: "About"   },
      { href: "/contact",  label: "Contact" },
      { href: "/careers",  label: "Careers" },
      { href: "/press",    label: "Press"   },
    ],
  },
  {
    heading: "Support",
    color:   "#A8D4AE",
    links: [
      { href: "/help",    label: "Help center"   },
      { href: "/trust",   label: "Trust & safety"},
      { href: "/terms",   label: "Terms"         },
      { href: "/privacy", label: "Privacy"       },
    ],
  },
];

export function Footer() {
  return (
    <footer style={{ background: "#0F172A" }} className="text-slate-100">
      <div className="container-shell grid gap-12 py-16 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
        {/* Brand column */}
        <div className="space-y-6">
          <Logo />
          <p className="max-w-xs text-sm leading-7 text-slate-400">
            A calmer, safer marketplace for HTU students to buy what they need
            and sell what they don't.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#0F172A] transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: "#7FB685", boxShadow: "0 4px 14px rgba(127,182,133,0.35)" }}
            >
              Browse Marketplace
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold text-slate-200 transition-all hover:border-white/30 hover:bg-white/8"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              Sell an Item
            </Link>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid gap-8 sm:grid-cols-3">
          {COLS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                {col.heading}
              </p>
              <div className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-slate-400 transition-colors hover:text-[#A8D4AE]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t py-6" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        <div className="container-shell flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 Campus Marche · Built for HTU students</p>
          <p>Secure meetups · Local listings · Real community</p>
        </div>
      </div>
    </footer>
  );
}
