"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogIn, ChevronDown, LogOut, User, ShoppingBag,
  Package, Settings, MessageCircle, Heart, Bell,
  BarChart2, X, Palette, ShoppingCart, Store, Wallet, ReceiptText,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/format";
import { clearAuthToken, hasAuthToken } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { AnimatedBell } from "@/components/animated-icons";
import { TextRoll } from "@/components/text-roll";
import { useProfile } from "@/hooks/use-api";
import { useCart } from "@/providers/cart-provider";
import { useCombinedNotifications } from "@/hooks/use-combined-notifications";
import { THEMES, useTheme } from "@/providers/theme-provider";
import { isEnvAdminToken } from "@/lib/auth";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

const NAV_LINKS = [
  { href: "/products",   label: "Shop"       },
  { href: "/categories", label: "Categories" },
  { href: "/events",     label: "Events"     },
];

/* ── User avatar ────────────────────────────────────────────── */
export function UserAvatar({
  avatar, name, size = 40, className = "",
}: {
  avatar?: string | null; name?: string | null; size?: number; className?: string;
}) {
  const isImageUrl = avatar && (avatar.startsWith("http") || avatar.startsWith("/uploads"));
  const initials   = name ? name.charAt(0).toUpperCase() : "?";

  if (isImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatar} alt={name ?? "Avatar"} width={size} height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }} />
    );
  }

  return (
    <div
      className={cn("grid place-items-center rounded-lg font-black text-white select-none", className)}
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg, #1E293B, #0F172A)",
        border:     "1.5px solid rgba(114,204,35,0.35)",
        fontSize:   Math.round(size * 0.42),
      }}
    >
      {initials}
    </div>
  );
}

/* ── Theme cycle button ─────────────────────────────────────── */
function ThemeCycleButton() {
  const { theme, setTheme } = useTheme();
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]!;
  const nextTheme = () => {
    const idx = THEMES.findIndex((t) => t.id === theme);
    const next = THEMES[(idx + 1) % THEMES.length]!;
    setTheme(next.id);
  };

  return (
    <motion.button
      type="button"
      onClick={nextTheme}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={spring}
      className="relative grid place-items-center rounded-xl transition-colors hover:bg-[var(--surface-raised)]"
      style={{ width: 34, height: 34, border: "1px solid var(--border)" }}
      aria-label={`Theme: ${current.label}. Click to cycle themes.`}
      title={`${current.label} — click to change theme`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={theme}
          initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
          animate={{ scale: 1,   opacity: 1, rotate: 0   }}
          exit={{    scale: 0.5, opacity: 0, rotate:  90  }}
          transition={spring}
          className="flex items-center justify-center"
        >
          <Palette size={14} style={{ color: current.accent }} />
        </motion.span>
      </AnimatePresence>
      {/* Small swatch dot */}
      <span
        className="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full ring-1 ring-white/50"
        style={{ background: current.accent }}
      />
    </motion.button>
  );
}

/* ── User dropdown ──────────────────────────────────────────── */
function UserDropdown({
  name, accountType, isAdmin, sellerId, hasBusiness, onClose, onLogout,
}: {
  name: string; accountType?: string; isAdmin?: boolean;
  sellerId?: string; hasBusiness?: boolean;
  onClose: () => void; onLogout: () => void;
}) {
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const items = [
    { icon: User,          label: "My Profile",    href: "/profile"          },
    { icon: Package,       label: "My Listings",   href: "/profile/listings" },
    { icon: Heart,         label: "Saved Items",   href: "/saved"            },
    { icon: MessageCircle, label: "Messages",      href: "/messages"         },
    { icon: ShoppingBag,   label: "My Orders",     href: "/orders"           },
    { icon: ReceiptText,  label: "Transactions",   href: "/transactions"      },
    ...(hasBusiness && sellerId
      ? [
          { icon: Store,  label: "My Storefront",    href: `/store/${sellerId}` },
          { icon: Wallet, label: "Wallet & Payouts",  href: "/wallet"            },
        ]
      : []),
  ];

  return (
    <motion.div
      ref={dropRef}
      initial={{ opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      exit={{    opacity: 0, scale: 0.95, y: -6 }}
      transition={spring}
      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl z-50"
      style={{
        background: "var(--surface)",
        border:     "1px solid var(--border)",
        boxShadow:  "0 16px 40px rgba(9,9,11,0.12)",
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>{name}</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {accountType ?? "HTU Campus Member"}
        </p>
      </div>

      <div className="py-1">
        {items.map(({ icon: Icon, label, href }) => (
          <Link key={label} href={href} onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-raised)]"
            style={{ color: "var(--on-surface)" }}
          >
            <Icon size={14} style={{ color: "var(--muted)" }} />
            {label}
          </Link>
        ))}
      </div>

      {isAdmin && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[rgba(239,68,68,0.05)]"
            style={{ color: "#EF4444" }}
          >
            <BarChart2 size={14} />
            Admin panel
          </Link>
        </>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }}>
        <button type="button" onClick={onLogout}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(239,68,68,0.05)]"
          style={{ color: "#EF4444" }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main Navbar ────────────────────────────────────────────── */
export function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { setTheme } = useTheme();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);

  const { data: profile } = useProfile();
  const { unreadCount }   = useCombinedNotifications();
  const { cartCount }     = useCart();

  // Sync token state on every route change; also run once immediately on mount
  useEffect(() => { setIsAuthenticated(hasAuthToken()); }, [pathname]);
  // Fast-path: check token synchronously on first client render to avoid flash
  useEffect(() => { setIsAuthenticated(hasAuthToken()); }, []);
  useEffect(() => { setMenuOpen(false); setUserDropOpen(false); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    clearAuthToken();
    setIsAuthenticated(false);
    setTheme("classic");
    setUserDropOpen(false);
    router.push("/");
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background:   scrolled ? "var(--background)" : "transparent",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
          boxShadow:    scrolled ? "0 1px 16px rgba(9,9,11,0.06)" : "none",
        }}
      >
        <div className="container-shell flex h-16 items-center justify-between gap-4">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link key={link.href} href={link.href}
                  className={cn(
                    "relative px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "text-[var(--on-surface)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]",
                  )}
                >
                  <TextRoll>{link.label}</TextRoll>
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-3.5 right-3.5 h-[2px] rounded-full"
                      style={{ background: "var(--green)" }}
                      transition={spring}
                    />
                  )}
                </Link>
              );
            })}
            {/* Sell — routes to onboarding for guests, sell page for members */}
            {(() => {
              const sellHref = isAuthenticated ? "/sell" : "/register?next=/onboarding";
              const active = pathname === "/sell" || pathname === "/onboarding";
              return (
                <Link href={sellHref}
                  className={cn(
                    "relative px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "text-[var(--on-surface)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]",
                  )}
                >
                  <TextRoll>Sell</TextRoll>
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-3.5 right-3.5 h-[2px] rounded-full"
                      style={{ background: "var(--green)" }}
                      transition={spring}
                    />
                  )}
                </Link>
              );
            })()}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* Notification bell */}
            {isAuthenticated && (
              <Link href="/notifications" aria-label="Notifications"
                className="relative hidden h-9 w-9 place-items-center rounded-xl transition-colors hover:bg-[var(--surface-raised)] sm:grid"
                style={{ color: "var(--muted)" }}
              >
                <AnimatedBell size={17} active={unreadCount > 0} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ background: "#72CC23" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ background: "#72CC23" }} />
                  </span>
                )}
              </Link>
            )}

            {/* Cart icon */}
            <Link href="/cart" aria-label="Cart"
              className="relative grid h-9 w-9 place-items-center rounded-xl transition-colors hover:bg-[var(--surface-raised)]"
              style={{ color: "var(--muted)" }}
            >
              <ShoppingCart size={17} />
              {cartCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                  style={{ background: "var(--green)" }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* Theme cycle button */}
            <ThemeCycleButton />

            {/* Auth */}
            {isAuthenticated ? (
              <div className="relative hidden md:block">
                <button type="button" onClick={() => setUserDropOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <UserAvatar avatar={profile?.avatar} name={profile?.name} size={28} />
                  <span className="max-w-[80px] truncate text-sm font-semibold"
                    style={{ color: "var(--on-surface)" }}>
                    {profile?.name?.split(" ")[0] ?? (
                      <span className="inline-block h-2.5 w-14 rounded-full animate-pulse"
                        style={{ background: "var(--border)" }} />
                    )}
                  </span>
                  <motion.div animate={{ rotate: userDropOpen ? 180 : 0 }} transition={spring}>
                    <ChevronDown size={13} style={{ color: "var(--muted)" }} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {userDropOpen && (
                    <UserDropdown
                      name={profile?.name ?? ""}
                      accountType={profile?.accountType}
                      isAdmin={profile?.role === "ADMIN" || isEnvAdminToken()}
                      sellerId={profile?.id}
                      hasBusiness={!!profile?.business}
                      onClose={() => setUserDropOpen(false)}
                      onLogout={handleLogout}
                    />
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login"
                className="hidden items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors md:flex"
                style={{ background: "#72CC23", color: "white" }}
              >
                <LogIn size={15} />
                Sign In
              </Link>
            )}

            {/* Mobile menu trigger — avatar if logged in, user icon if not; hidden on desktop */}
            <button type="button" onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors hover:bg-[var(--surface-raised)] md:hidden"
              aria-label="Open menu"
            >
              {isAuthenticated && profile
                ? <UserAvatar avatar={profile.avatar} name={profile.name} size={28} />
                : <User size={18} style={{ color: "var(--on-surface)" }} />}
            </button>
          </div>
        </div>

      </header>

      {/* Mobile side drawer — slides in from right, rendered outside header for correct z-index */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(9,9,11,0.45)", backdropFilter: "blur(2px)" }}
              onClick={() => setMenuOpen(false)}
            />
            {/* Drawer panel */}
            <motion.div
              key="mobile-drawer"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto md:hidden"
              style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 32px rgba(9,9,11,0.10)" }}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-base font-black" style={{ color: "var(--on-surface)" }}>Menu</span>
                  <button type="button" onClick={() => setMenuOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-xl hover:bg-[var(--surface-raised)]"
                    style={{ color: "var(--muted)" }}>
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-1 px-3 py-3">
                  {[
                    { href: "/products",   label: "Shop",       Icon: ShoppingBag   },
                    { href: "/messages",   label: "Messages",   Icon: MessageCircle },
                    { href: isAuthenticated ? "/sell" : "/register?next=/onboarding",
                                           label: "Sell",       Icon: Package,       activeOn: "/sell" },
                    { href: "/categories", label: "Categories", Icon: null          },
                    { href: "/events",     label: "Events",     Icon: null          },
                  ].map(({ href, label, Icon, activeOn }) => {
                    const active = pathname.startsWith((activeOn ?? href).split("?")[0]!);
                    return (
                      <Link key={label} href={href} onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                          active ? "bg-[rgba(22,163,74,0.10)] text-[var(--green)]" : "text-[var(--muted)] hover:bg-[var(--surface-raised)]",
                        )}
                      >
                        {Icon && <Icon size={15} />}
                        {label}
                        {label === "Messages" && unreadCount > 0 && (
                          <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-black text-white"
                            style={{ background: "#72CC23" }}>{unreadCount}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {isAuthenticated ? (
                  <>
                    {/* User identity */}
                    <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl px-4 py-3"
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                      <UserAvatar avatar={profile?.avatar} name={profile?.name} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold" style={{ color: "var(--on-surface)" }}>{profile?.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>{profile?.accountType ?? "Campus member"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 px-3 pb-3">
                      {/* Account links — unique to drawer (not in bottom nav) */}
                      {[
                        { icon: User,        label: "My Profile",      href: "/profile"               },
                        { icon: Package,     label: "My Listings",     href: "/profile/listings"      },
                        { icon: Heart,       label: "Saved Items",     href: "/saved"                 },
                        { icon: ShoppingBag, label: "My Orders",       href: "/orders"                },
                        { icon: ReceiptText, label: "Transactions",    href: "/transactions"          },
                        ...(profile?.business && profile?.id
                          ? [
                              { icon: Store,  label: "My Storefront",   href: `/store/${profile.id}` },
                              { icon: Wallet, label: "Wallet & Payouts", href: "/wallet"              },
                            ]
                          : []),
                        { icon: Bell,        label: "Notifications",   href: "/notifications"         },
                        { icon: Settings,    label: "Settings",        href: "/settings"              },
                      ].map(({ icon: Icon, label, href }) => (
                        <Link key={label} href={href} onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)]"
                          style={{ color: "var(--on-surface)" }}
                        >
                          <Icon size={14} style={{ color: "var(--muted)" }} />
                          {label}
                          {label === "Notifications" && unreadCount > 0 && (
                            <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-black text-white"
                              style={{ background: "#72CC23" }}>{unreadCount}</span>
                          )}
                        </Link>
                      ))}

                      <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                        <button type="button" onClick={() => { setMenuOpen(false); handleLogout(); }}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(239,68,68,0.05)]"
                          style={{ color: "#EF4444" }}
                        >
                          <LogOut size={14} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="px-3 pb-4">
                    <Link href="/login" onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white"
                      style={{ background: "#72CC23" }}>
                      <LogIn size={15} /> Sign In to your account
                    </Link>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

      <div className="h-16" aria-hidden />
    </>
  );
}

