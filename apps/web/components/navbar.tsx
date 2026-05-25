"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, MessageSquare, Settings, Shield, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { clearAuthToken, hasAuthToken } from "@/lib/auth";
import { Logo, SearchBar } from "@/components/ui";
import { useNotifications, useProfile } from "@/hooks/use-api";

const links = [
  { href: "/products",  label: "Products"   },
  { href: "/categories",label: "Categories" },
  { href: "/events",    label: "Events"     },
  { href: "/orders",    label: "Orders"     },
  { href: "/messages",  label: "Messages"   },
];

function NotificationBell() {
  const { data: notifications } = useNotifications();
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <Link
      href="/notifications"
      className="relative grid h-10 w-10 place-items-center rounded-xl transition-colors"
      style={{ background: "rgba(127,182,133,0.10)", color: "#5A9460" }}
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#C68B59] text-[10px] font-black text-white shadow-sm">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === "ADMIN";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-xl border transition-all hover:shadow-sm"
        style={{
          borderColor: "rgba(226,232,240,0.70)",
          background:  "rgba(255,255,255,0.80)",
          color:       "#1E293B",
        }}
        aria-label="Account menu"
      >
        <UserRound className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-50 min-w-[180px] overflow-hidden rounded-2xl py-1.5 shadow-xl"
          style={{
            background:    "rgba(255,255,255,0.96)",
            backdropFilter:"blur(20px)",
            border:        "1px solid rgba(226,232,240,0.70)",
          }}
        >
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50"
            style={{ color: "#1E293B" }}
          >
            <UserRound className="h-4 w-4" style={{ color: "#64748B" }} />
            My profile
          </Link>
          <Link
            href="/profile/edit"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50"
            style={{ color: "#1E293B" }}
          >
            <Settings className="h-4 w-4" style={{ color: "#64748B" }} />
            Settings
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-red-50"
              style={{ color: "#EF4444" }}
            >
              <Shield className="h-4 w-4" />
              Admin panel
            </Link>
          )}
          <div className="my-1 border-t" style={{ borderColor: "rgba(226,232,240,0.60)" }} />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-red-50"
            style={{ color: "#DC2626" }}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => { setIsAuthenticated(hasAuthToken()); }, [pathname]);

  function handleLogout() {
    clearAuthToken();
    setIsAuthenticated(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-40 border-b shadow-sm"
      style={{
        background:    "rgba(250, 247, 242, 0.88)",
        backdropFilter:"blur(28px) saturate(160%)",
        WebkitBackdropFilter:"blur(28px) saturate(160%)",
        borderColor:   "rgba(226, 232, 240, 0.55)",
        boxShadow:     "0 1px 20px rgba(15,23,42,0.06)",
      }}
    >
      <div className="container-shell flex min-h-[68px] items-center gap-5">
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-semibold transition-all",
                pathname.startsWith(link.href)
                  ? "font-bold"
                  : "text-[#64748B] hover:text-[#1E293B]",
              )}
              style={pathname.startsWith(link.href)
                ? { background: "rgba(127,182,133,0.12)", color: "#5A9460" }
                : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-64 flex-1 md:block">
          <SearchBar />
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/sell" className="btn-primary px-5 py-2.5 text-sm">
            <ShoppingBag className="h-4 w-4" />
            Sell
          </Link>
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <AccountMenu onLogout={handleLogout} />
            </>
          ) : (
            <Link
              href="/login"
              className="grid h-10 w-10 place-items-center rounded-xl border transition-all hover:shadow-sm"
              style={{
                borderColor: "rgba(226,232,240,0.70)",
                background:  "rgba(255,255,255,0.80)",
                color:       "#1E293B",
              }}
              aria-label="Log in"
            >
              <UserRound className="h-5 w-5" />
            </Link>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl border transition-colors md:hidden"
          style={{
            borderColor: "rgba(226,232,240,0.70)",
            background:  "rgba(255,255,255,0.80)",
            color:       "#1E293B",
          }}
          aria-label="Open menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t p-4 md:hidden"
          style={{
            background:    "rgba(250,247,242,0.96)",
            backdropFilter:"blur(28px)",
            borderColor:   "rgba(226,232,240,0.50)",
          }}
        >
          <SearchBar />
          <div className="mt-4 grid gap-1">
            {[
              ...links,
              { href: "/sell",          label: "Sell"          },
              { href: "/notifications", label: "Notifications" },
              ...(isAuthenticated
                ? [{ href: "/profile", label: "Profile" }]
                : [{ href: "/login",   label: "Log in"   }]),
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                  pathname.startsWith(link.href)
                    ? "font-bold"
                    : "text-[#64748B] hover:text-[#1E293B]",
                )}
                style={pathname.startsWith(link.href)
                  ? { background: "rgba(127,182,133,0.12)", color: "#5A9460" }
                  : undefined}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
              >
                Log out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => { setIsAuthenticated(hasAuthToken()); }, [pathname]);

  function handleLogout() {
    clearAuthToken();
    router.push("/");
    router.refresh();
  }

  const items = [
    { href: "/products",  label: "Shop",    icon: ShoppingBag },
    { href: "/messages",  label: "Chat",    icon: MessageSquare },
    { href: "/sell",      label: "Sell",    icon: ShoppingBag },
    {
      href:  isAuthenticated ? "/profile" : "/login?next=/profile",
      label: isAuthenticated ? "Profile"  : "Log in",
      icon:  UserRound,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t px-2 py-2 md:hidden"
      style={{
        background:    "rgba(250,247,242,0.94)",
        backdropFilter:"blur(28px) saturate(160%)",
        WebkitBackdropFilter:"blur(28px) saturate(160%)",
        borderColor:   "rgba(226,232,240,0.55)",
        boxShadow:     "0 -1px 20px rgba(15,23,42,0.06)",
      }}
    >
      <div className="grid grid-cols-4 gap-0.5">
        {items.map((item) => {
          const Icon   = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="grid place-items-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all"
              style={active
                ? { background: "rgba(127,182,133,0.12)", color: "#5A9460" }
                : { color: "#94A3B8" }}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      {/* Hidden logout trigger — only here for the mobile logout in hamburger, not visible */}
      {isAuthenticated && (
        <button className="sr-only" onClick={handleLogout}>Log out</button>
      )}
    </nav>
  );
}
