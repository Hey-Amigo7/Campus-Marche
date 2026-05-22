"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, MessageSquare, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";
import { hasAuthToken } from "@/lib/auth";
import { Logo, SearchBar } from "@/components/ui";
import { useNotifications } from "@/hooks/use-api";

const links = [
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/events", label: "Events" },
  { href: "/orders", label: "Orders" },
  { href: "/messages", label: "Messages" },
];

function NotificationBell() {
  const { data: notifications } = useNotifications();
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <Link
      href="/notifications"
      className="relative grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-brand-navy hover:bg-indigo-100 transition-colors"
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-[10px] font-black text-white shadow-sm">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(hasAuthToken());
  }, [pathname]);

  const accountHref = isAuthenticated ? "/profile" : "/login?next=/profile";
  const accountLabel = isAuthenticated ? "Profile" : "Log in";

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/75 shadow-sm shadow-indigo-200/20 backdrop-blur-2xl"
      style={{ backdropFilter: "blur(28px) saturate(180%)" }}>
      <div className="container-shell flex min-h-[68px] items-center gap-5">
        <Logo />
        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-bold transition-all",
                pathname.startsWith(link.href)
                  ? "bg-indigo-50/80 text-brand-navy shadow-sm shadow-indigo-100/60"
                  : "text-slate-500 hover:bg-white/70 hover:text-brand-navy hover:shadow-sm hover:shadow-indigo-100/40",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden min-w-64 flex-1 md:block">
          <SearchBar />
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/sell" className="btn-primary px-4 py-2.5 text-sm">
            <ShoppingBag className="h-4 w-4" />
            Sell
          </Link>
          {isAuthenticated ? <NotificationBell /> : null}
          <Link
            href={accountHref}
            className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-100/60 bg-white/70 text-brand-navy shadow-sm shadow-indigo-100/30 backdrop-blur-sm hover:bg-white hover:shadow-md hover:shadow-indigo-200/30 transition-all"
            aria-label={accountLabel}
          >
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-white/60 bg-white/70 text-brand-navy shadow-sm backdrop-blur-sm md:hidden"
          aria-label="Open menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-white/50 bg-white/80 p-4 backdrop-blur-2xl md:hidden">
          <SearchBar />
          <div className="mt-4 grid gap-1">
            {[
              ...links,
              { href: "/sell", label: "Sell" },
              { href: "/notifications", label: "Notifications" },
              { href: accountHref, label: accountLabel },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-3 text-sm font-bold transition-all",
                  pathname.startsWith(link.href)
                    ? "bg-indigo-50/80 text-brand-navy"
                    : "text-slate-600 hover:bg-white/70 hover:text-brand-navy",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(hasAuthToken());
  }, [pathname]);

  const items = [
    { href: "/products", label: "Shop", icon: ShoppingBag },
    { href: "/messages", label: "Chat", icon: MessageSquare },
    { href: "/sell", label: "Sell", icon: ShoppingBag },
    {
      href: isAuthenticated ? "/profile" : "/login?next=/profile",
      label: isAuthenticated ? "Profile" : "Log in",
      icon: UserRound,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/50 bg-white/80 px-2 py-2 shadow-lg shadow-indigo-100/20 backdrop-blur-2xl md:hidden">
      <div className="grid grid-cols-4 gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "grid place-items-center gap-1 rounded-xl py-2 text-xs font-bold transition-all",
                active
                  ? "bg-indigo-50 text-brand-navy shadow-sm"
                  : "text-slate-400 hover:text-brand-navy",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-brand-navy")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
