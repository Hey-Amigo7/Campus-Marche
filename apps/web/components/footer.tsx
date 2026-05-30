import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { ScrollDrawLine } from "@/components/motion-primitives";

const LINKS = {
  Marketplace: [
    { label: "Browse Products", href: "/products"   },
    { label: "Categories",      href: "/categories" },
    { label: "Events",          href: "/events"     },
    { label: "Deals",           href: "/deals"      },
  ],
  Selling: [
    { label: "Start Selling", href: "/sell"  },
    { label: "Seller Guide",  href: "/help"  },
    { label: "Pricing",       href: "/help"  },
  ],
  Company: [
    { label: "About",   href: "/about"   },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms",   href: "/terms"   },
  ],
};

export function Footer() {
  return (
    <footer
      className="mt-24 border-t"
      style={{ borderColor: "var(--border)", background: "var(--background-alt)" }}
    >
      <ScrollDrawLine className="opacity-60" />

      <div className="container-shell py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <LogoMark size={36} />
              <span className="font-extrabold tracking-tight" style={{ fontSize: "1.05rem", color: "var(--on-surface)" }}>
                Campus<span style={{ color: "#72CC23" }}>Marche</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              HTU&apos;s trusted student marketplace. Buy, sell, and connect safely
              within the campus community.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <h3
                className="mb-4 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--subtle)" }}
              >
                {group}
              </h3>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm transition-colors hover:text-[#72CC23]"
                      style={{ color: "var(--muted)" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row"
          style={{ borderColor: "var(--border)", color: "var(--subtle)" }}
        >
          <span>© {new Date().getFullYear()} Campus Marche. All rights reserved.</span>
          <span>Built for HTU students, by HTU students. 🇬🇭</span>
        </div>
      </div>
    </footer>
  );
}
