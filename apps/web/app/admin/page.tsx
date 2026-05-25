"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Inbox,
  LayoutDashboard,
  Loader2,
  Megaphone,
  Package,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useProfile } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { isEnvAdminToken } from "@/lib/auth";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "listings" | "reports" | "events" | "messages";

type AdminStats = {
  users: number;
  products: number;
  orders: number;
  pendingReports: number;
  revenue: number;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  premium: boolean;
  canEditEvents: boolean;
  createdAt: string;
  business: { name: string } | null;
  _count: { products: number; orders: number };
};

type AdminProduct = {
  id: string;
  title: string;
  price: number;
  category: string | null;
  active: boolean;
  featured: boolean;
  views: number;
  createdAt: string;
  seller: { id: string; name: string };
};

type AdminReport = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string } | null;
  reportedUser: { id: string; name: string } | null;
  product: { id: string; title: string } | null;
};

type AdminEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  category: string;
  opportunity?: string | null;
  imageUrl?: string | null;
  featured?: boolean;
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

// ─── Shared styles ─────────────────────────────────────────────────────────────

const CARD = {
  background: "rgba(255,255,255,0.90)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(226,232,240,0.65)",
  boxShadow: "0 2px 14px rgba(15,23,42,0.06)",
};

const ROW_HOVER = "transition-colors hover:bg-slate-50/60";

// ─── Gate: only render for ADMIN role ─────────────────────────────────────────

function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useProfile();
  const envAdmin = typeof window !== "undefined" ? isEnvAdminToken() : false;

  if (!envAdmin && isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#7FB685" }} />
      </div>
    );
  }

  if (!envAdmin && (!profile || profile.role !== "ADMIN")) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Shield className="h-12 w-12" style={{ color: "#E2E8F0" }} />
        <p className="text-lg font-black" style={{ color: "#1E293B" }}>Admin access required</p>
        <p className="text-sm" style={{ color: "#64748B" }}>This area is restricted to platform administrators.</p>
        <Link href="/admin/login"
          className="mt-2 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black text-white"
          style={{ background: "#0F172A" }}>
          <Shield className="h-4 w-4" /> Go to admin login
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl p-5" style={CARD}>
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: accent + "18" }}>
        <div style={{ color: accent }}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color: "#1E293B" }}>{value}</p>
        <p className="text-xs font-semibold" style={{ color: "#64748B" }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading } = useSWR<AdminStats>("admin-stats", api.admin.getStats);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: "rgba(226,232,240,0.40)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.users.toLocaleString()} icon={<Users className="h-5 w-5" />} accent="#7FB685" />
        <StatCard label="Active listings" value={stats.products.toLocaleString()} icon={<Package className="h-5 w-5" />} accent="#0F172A" />
        <StatCard label="Total orders" value={stats.orders.toLocaleString()} icon={<BarChart3 className="h-5 w-5" />} accent="#C68B59" />
        <StatCard label="Pending reports" value={stats.pendingReports} icon={<AlertTriangle className="h-5 w-5" />} accent={stats.pendingReports > 0 ? "#EF4444" : "#94A3B8"} />
      </div>
      <div className="rounded-2xl p-5" style={CARD}>
        <p className="text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Platform revenue</p>
        <p className="mt-1 text-3xl font-black" style={{ color: "#1E293B" }}>{formatCurrency(stats.revenue)}</p>
        <p className="mt-1 text-xs" style={{ color: "#94A3B8" }}>Total from completed Paystack transactions</p>
      </div>
    </div>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const take = 20;
  const [warnTarget, setWarnTarget] = useState<{ id: string; name: string } | null>(null);
  const [warnMessage, setWarnMessage] = useState("");
  const [warnLoading, setWarnLoading] = useState(false);
  const [warnError, setWarnError] = useState<string | null>(null);
  const [warnSent, setWarnSent] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    ["admin-users", skip, debouncedQ],
    () => api.admin.getUsers(skip, take, debouncedQ || undefined),
    { keepPreviousData: true },
  );

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  function handleSearch(val: string) {
    setQ(val);
    clearTimeout((window as Window & { _userSearchTimer?: ReturnType<typeof setTimeout> })._userSearchTimer);
    (window as Window & { _userSearchTimer?: ReturnType<typeof setTimeout> })._userSearchTimer = setTimeout(() => {
      setDebouncedQ(val);
      setSkip(0);
    }, 300);
  }

  async function suspend(userId: string) {
    await api.admin.suspendUser(userId);
    await mutate();
  }

  async function setRole(userId: string, role: string) {
    await api.admin.setUserRole(userId, role);
    await mutate();
  }

  async function toggleEventsPermission(userId: string, current: boolean) {
    await api.admin.grantEventsPermission(userId, !current);
    await mutate();
  }

  async function sendWarn() {
    if (!warnTarget || !warnMessage.trim()) return;
    setWarnLoading(true);
    setWarnError(null);
    try {
      await api.admin.sendWarning(warnTarget.id, warnMessage.trim());
      setWarnSent(true);
      setTimeout(() => {
        setWarnTarget(null);
        setWarnMessage("");
        setWarnSent(false);
      }, 1500);
    } catch (err) {
      setWarnError(err instanceof Error ? err.message : "Failed to send warning.");
    } finally {
      setWarnLoading(false);
    }
  }

  function closeWarn() {
    setWarnTarget(null);
    setWarnMessage("");
    setWarnError(null);
    setWarnSent(false);
  }

  return (
    <div className="space-y-4">
      {/* ── Warn modal ── */}
      {warnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.50)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-3xl" style={{ background: "#fff", boxShadow: "0 24px 80px rgba(15,23,42,0.18)" }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(226,232,240,0.60)" }}>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: "rgba(234,179,8,0.12)" }}>
                  <Megaphone className="h-4 w-4" style={{ color: "#B45309" }} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: "#1E293B" }}>Send warning</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>{warnTarget.name}</p>
                </div>
              </div>
              <button onClick={closeWarn} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {warnSent ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "rgba(127,182,133,0.15)" }}>
                    <Check className="h-6 w-6" style={{ color: "#5A9460" }} />
                  </div>
                  <p className="font-bold" style={{ color: "#1E293B" }}>Warning sent</p>
                </div>
              ) : (
                <>
                  <label className="mb-1.5 block text-xs font-black" style={{ color: "#64748B" }}>Warning message</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the policy violation and expected corrective action…"
                    value={warnMessage}
                    onChange={(e) => setWarnMessage(e.target.value)}
                    className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "#F8FAFC", border: "1px solid rgba(226,232,240,0.80)", color: "#1E293B" }}
                  />
                  <p className="mt-1 text-right text-xs" style={{ color: "#94A3B8" }}>{warnMessage.length}/1000</p>
                  {warnError && (
                    <p className="mt-2 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>{warnError}</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button onClick={closeWarn}
                      className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold"
                      style={{ background: "#F1F5F9", color: "#475569" }}>
                      Cancel
                    </button>
                    <button
                      onClick={sendWarn}
                      disabled={warnLoading || warnMessage.trim().length < 10}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                      style={{ background: "#B45309" }}
                    >
                      {warnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                      Send warning
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-semibold outline-none"
            style={{ background: "rgba(255,255,255,0.90)", border: "1px solid rgba(226,232,240,0.70)", color: "#1E293B" }}
          />
        </div>
        <span className="text-sm font-semibold" style={{ color: "#64748B" }}>{total.toLocaleString()} users</span>
      </div>

      <div className="overflow-hidden rounded-2xl" style={CARD}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(226,232,240,0.60)" }}>
              {["User", "Role", "Listings", "Orders", "Joined", "Events editor", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded-full" style={{ background: "#F1F5F9", width: j === 0 ? "80%" : "50%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: "#94A3B8" }}>No users found</td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id} className={ROW_HOVER} style={{ borderBottom: "1px solid rgba(226,232,240,0.40)" }}>
                <td className="px-4 py-3">
                  <p className="font-bold" style={{ color: "#1E293B" }}>{user.name}</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>{user.email}</p>
                  {user.business && <p className="text-xs font-semibold" style={{ color: "#7FB685" }}>{user.business.name}</p>}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => setRole(user.id, e.target.value)}
                    className="rounded-lg px-2 py-1 text-xs font-bold outline-none"
                    style={{
                      background: user.role === "ADMIN" ? "#0F172A" : user.role === "MODERATOR" ? "#7FB685" : "#F1F5F9",
                      color: user.role === "ADMIN" || user.role === "MODERATOR" ? "#fff" : "#475569",
                      border: "none",
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-4 py-3 font-semibold" style={{ color: "#1E293B" }}>{user._count.products}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: "#1E293B" }}>{user._count.orders}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#94A3B8" }}>{formatRelativeDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleEventsPermission(user.id, user.canEditEvents)}
                    title={user.canEditEvents ? "Revoke events editing" : "Grant events editing"}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:opacity-80"
                    style={{
                      background: user.canEditEvents ? "rgba(127,182,133,0.18)" : "rgba(226,232,240,0.60)",
                      color: user.canEditEvents ? "#4A7C59" : "#94A3B8",
                    }}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {user.canEditEvents ? "Yes" : "No"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setWarnTarget({ id: user.id, name: user.name })}
                      title="Send warning"
                      className="grid h-8 w-8 place-items-center rounded-lg transition-all hover:scale-110"
                      style={{ background: "rgba(234,179,8,0.10)" }}
                    >
                      <Megaphone className="h-4 w-4" style={{ color: "#B45309" }} />
                    </button>
                    <button
                      onClick={() => suspend(user.id)}
                      title={user.verified ? "Suspend user" : "User already suspended"}
                      className="grid h-8 w-8 place-items-center rounded-lg transition-all hover:scale-110"
                      style={{ background: user.verified ? "rgba(239,68,68,0.10)" : "rgba(148,163,184,0.10)" }}
                    >
                      <ShieldOff className="h-4 w-4" style={{ color: user.verified ? "#EF4444" : "#94A3B8" }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination skip={skip} take={take} total={total} onPage={setSkip} />
    </div>
  );
}

// ─── Listings tab ─────────────────────────────────────────────────────────────

function ListingsTab() {
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const take = 20;

  const { data, isLoading, mutate } = useSWR(
    ["admin-products", skip, debouncedQ],
    () => api.admin.getProducts(skip, take, debouncedQ || undefined),
    { keepPreviousData: true },
  );

  const products = data?.products ?? [];
  const total = data?.total ?? 0;

  function handleSearch(val: string) {
    setQ(val);
    clearTimeout((window as Window & { _productSearchTimer?: ReturnType<typeof setTimeout> })._productSearchTimer);
    (window as Window & { _productSearchTimer?: ReturnType<typeof setTimeout> })._productSearchTimer = setTimeout(() => {
      setDebouncedQ(val);
      setSkip(0);
    }, 300);
  }

  async function toggle(id: string, currentlyActive: boolean) {
    if (currentlyActive) await api.admin.deactivateProduct(id);
    else await api.admin.activateProduct(id);
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="Search listings…"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-semibold outline-none"
            style={{ background: "rgba(255,255,255,0.90)", border: "1px solid rgba(226,232,240,0.70)", color: "#1E293B" }}
          />
        </div>
        <span className="text-sm font-semibold" style={{ color: "#64748B" }}>{total.toLocaleString()} listings</span>
      </div>

      <div className="overflow-hidden rounded-2xl" style={CARD}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(226,232,240,0.60)" }}>
              {["Title", "Seller", "Category", "Price", "Views", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded-full" style={{ background: "#F1F5F9", width: j === 0 ? "80%" : "50%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: "#94A3B8" }}>No listings found</td>
              </tr>
            ) : products.map((p) => (
              <tr key={p.id} className={ROW_HOVER} style={{ borderBottom: "1px solid rgba(226,232,240,0.40)" }}>
                <td className="max-w-[200px] px-4 py-3">
                  <p className="truncate font-bold" style={{ color: "#1E293B" }}>{p.title}</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>{formatRelativeDate(p.createdAt)}</p>
                </td>
                <td className="px-4 py-3 text-xs font-semibold" style={{ color: "#475569" }}>{p.seller.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#94A3B8" }}>{p.category ?? "—"}</td>
                <td className="px-4 py-3 font-bold" style={{ color: "#1E293B" }}>{formatCurrency(p.price)}</td>
                <td className="px-4 py-3 text-xs font-semibold" style={{ color: "#64748B" }}>{p.views}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-black"
                    style={{ background: p.active ? "rgba(127,182,133,0.15)" : "rgba(239,68,68,0.10)", color: p.active ? "#5A9460" : "#EF4444" }}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                  {p.featured && (
                    <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-black"
                      style={{ background: "rgba(198,139,89,0.15)", color: "#C68B59" }}>Featured</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggle(p.id, p.active)}
                    className="grid h-8 w-8 place-items-center rounded-lg transition-all hover:scale-110"
                    style={{ background: p.active ? "rgba(239,68,68,0.10)" : "rgba(127,182,133,0.10)" }}
                    title={p.active ? "Deactivate" : "Activate"}
                  >
                    {p.active
                      ? <EyeOff className="h-4 w-4" style={{ color: "#EF4444" }} />
                      : <Eye className="h-4 w-4" style={{ color: "#7FB685" }} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination skip={skip} take={take} total={total} onPage={setSkip} />
    </div>
  );
}

// ─── Reports tab ──────────────────────────────────────────────────────────────

const REPORT_STATUS_COLORS: Record<string, string> = {
  pending: "#EF4444",
  resolved: "#7FB685",
  dismissed: "#94A3B8",
  actioned: "#C68B59",
};

function ReportsTab() {
  const [skip, setSkip] = useState(0);
  const take = 20;
  const { data, isLoading, mutate } = useSWR(
    ["admin-reports", skip],
    () => api.admin.getReports(skip, take),
    { keepPreviousData: true },
  );

  const reports = data?.reports ?? [];
  const total = data?.total ?? 0;

  async function resolve(id: string, status: string) {
    await api.admin.resolveReport(id, status);
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "#64748B" }}>{total} reports total</span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: "rgba(226,232,240,0.40)" }} />
          ))
        ) : reports.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={CARD}>
            <Check className="mx-auto h-10 w-10" style={{ color: "#7FB685" }} />
            <p className="mt-3 font-bold" style={{ color: "#1E293B" }}>No reports</p>
          </div>
        ) : reports.map((r) => (
          <div key={r.id} className="rounded-2xl p-4" style={CARD}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black capitalize"
                    style={{ background: (REPORT_STATUS_COLORS[r.status] ?? "#94A3B8") + "18", color: REPORT_STATUS_COLORS[r.status] ?? "#94A3B8" }}>
                    {r.status}
                  </span>
                  <span className="text-xs font-bold" style={{ color: "#1E293B" }}>{r.reason}</span>
                  <span className="text-xs" style={{ color: "#94A3B8" }}>{formatRelativeDate(r.createdAt)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs" style={{ color: "#64748B" }}>
                  {r.reporter && <span>Reporter: <strong>{r.reporter.name}</strong></span>}
                  {r.reportedUser && <span>Reported: <strong>{r.reportedUser.name}</strong></span>}
                  {r.product && <span>Listing: <strong>{r.product.title}</strong></span>}
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => resolve(r.id, "resolved")}
                    className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
                    style={{ background: "rgba(127,182,133,0.15)", color: "#5A9460" }}>
                    Resolve
                  </button>
                  <button onClick={() => resolve(r.id, "actioned")}
                    className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
                    style={{ background: "rgba(198,139,89,0.15)", color: "#C68B59" }}>
                    Action
                  </button>
                  <button onClick={() => resolve(r.id, "dismissed")}
                    className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
                    style={{ background: "rgba(148,163,184,0.10)", color: "#94A3B8" }}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination skip={skip} take={take} total={total} onPage={setSkip} />
    </div>
  );
}

// ─── Events tab ───────────────────────────────────────────────────────────────

const EMPTY_EVENT = { title: "", description: "", location: "", eventDate: "", category: "", opportunity: "", imageUrl: "" };

function EventsTab() {
  const { data: events = [], isLoading, mutate } = useSWR("admin-events", api.admin.getEvents);
  const [editing, setEditing] = useState<(typeof EMPTY_EVENT & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editing.id) {
        await api.admin.updateEvent(editing.id, { ...editing, eventDate: editing.eventDate });
      } else {
        await api.admin.createEvent({ ...editing });
      }
      await mutate();
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save event. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setEditing(null);
    setSaveError(null);
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await api.admin.deleteEvent(id);
      await mutate();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "#64748B" }}>{events.length} events</span>
        <button
          onClick={() => setEditing(EMPTY_EVENT)}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black text-white transition-all hover:-translate-y-0.5"
          style={{ background: "#7FB685", boxShadow: "0 4px 14px rgba(127,182,133,0.30)" }}
        >
          <Plus className="h-4 w-4" /> New event
        </button>
      </div>

      {/* Event form modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.50)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-lg rounded-3xl flex flex-col" style={{ background: "#fff", boxShadow: "0 24px 80px rgba(15,23,42,0.18)", maxHeight: "90vh" }}>
            <div className="flex shrink-0 items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(226,232,240,0.60)" }}>
              <h3 className="font-black" style={{ color: "#1E293B" }}>{editing.id ? "Edit event" : "New event"}</h3>
              <button onClick={closeModal} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-5">
              {[
                { key: "title", label: "Title", type: "text" },
                { key: "location", label: "Location", type: "text" },
                { key: "category", label: "Category", type: "text" },
                { key: "eventDate", label: "Event date", type: "datetime-local" },
                { key: "imageUrl", label: "Image URL (optional)", type: "text" },
                { key: "opportunity", label: "Opportunity tag (optional)", type: "text" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-black" style={{ color: "#64748B" }}>{label}</label>
                  <input
                    type={type}
                    value={(editing as Record<string, string>)[key] ?? ""}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "#F8FAFC", border: "1px solid rgba(226,232,240,0.80)", color: "#1E293B" }}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-black" style={{ color: "#64748B" }}>Description</label>
                <textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: "#F8FAFC", border: "1px solid rgba(226,232,240,0.80)", color: "#1E293B" }}
                />
              </div>
            </div>
            {saveError && (
              <div className="mx-5 mb-1 rounded-xl px-3 py-2.5 text-sm font-semibold"
                style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.20)" }}>
                {saveError}
              </div>
            )}
            <div className="flex shrink-0 justify-end gap-2 p-5" style={{ borderTop: "1px solid rgba(226,232,240,0.60)" }}>
              <button onClick={closeModal}
                className="rounded-xl px-4 py-2 text-sm font-bold"
                style={{ background: "#F1F5F9", color: "#475569" }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-black text-white disabled:opacity-60"
                style={{ background: "#7FB685" }}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing.id ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: "rgba(226,232,240,0.40)" }} />
          ))
        ) : events.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={CARD}>
            <CalendarDays className="mx-auto h-10 w-10" style={{ color: "#E2E8F0" }} />
            <p className="mt-3 font-bold" style={{ color: "#1E293B" }}>No events yet</p>
          </div>
        ) : events.map((ev) => (
          <div key={ev.id} className="flex items-start gap-4 rounded-2xl p-4" style={CARD}>
            {ev.imageUrl && (
              <img src={ev.imageUrl} alt={ev.title} className="h-14 w-20 shrink-0 rounded-xl object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black" style={{ color: "#1E293B" }}>{ev.title}</p>
              <p className="mt-0.5 text-xs" style={{ color: "#94A3B8" }}>
                {new Date(ev.eventDate).toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {" · "}{ev.location}
                {" · "}{ev.category}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button onClick={() => setEditing({ title: ev.title, description: ev.description, location: ev.location, eventDate: ev.eventDate.slice(0, 16), category: ev.category, opportunity: ev.opportunity ?? "", imageUrl: ev.imageUrl ?? "", id: ev.id })}
                className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
                style={{ background: "rgba(15,23,42,0.07)", color: "#1E293B" }}>
                Edit
              </button>
              <button onClick={() => remove(ev.id)} disabled={deleting === ev.id}
                className="grid h-8 w-8 place-items-center rounded-xl transition-all hover:scale-110"
                style={{ background: "rgba(239,68,68,0.10)" }}>
                {deleting === ev.id
                  ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#EF4444" }} />
                  : <Trash2 className="h-4 w-4" style={{ color: "#EF4444" }} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Messages tab ─────────────────────────────────────────────────────────────

const MSG_STATUS_COLORS: Record<string, string> = {
  new: "#7FB685",
  resolved: "#94A3B8",
};

function MessagesTab() {
  const [skip, setSkip] = useState(0);
  const take = 20;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR(
    ["admin-contact-messages", skip],
    () => api.admin.getContactMessages(skip, take),
    { keepPreviousData: true },
  );

  const messages: ContactMessage[] = data?.messages ?? [];
  const total = data?.total ?? 0;

  async function resolve(id: string) {
    setResolving(id);
    try {
      await api.admin.resolveContactMessage(id);
      await mutate();
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "#64748B" }}>{total} messages total</span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: "rgba(226,232,240,0.40)" }} />
          ))
        ) : messages.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={CARD}>
            <Inbox className="mx-auto h-10 w-10" style={{ color: "#E2E8F0" }} />
            <p className="mt-3 font-bold" style={{ color: "#1E293B" }}>No messages yet</p>
            <p className="mt-1 text-sm" style={{ color: "#94A3B8" }}>Contact form submissions will appear here.</p>
          </div>
        ) : messages.map((msg) => (
          <div key={msg.id} className="rounded-2xl overflow-hidden" style={CARD}>
            <button
              className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-slate-50/60"
              onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
            >
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: (MSG_STATUS_COLORS[msg.status] ?? "#94A3B8") + "18" }}>
                <Inbox className="h-4 w-4" style={{ color: MSG_STATUS_COLORS[msg.status] ?? "#94A3B8" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black capitalize"
                    style={{ background: (MSG_STATUS_COLORS[msg.status] ?? "#94A3B8") + "18", color: MSG_STATUS_COLORS[msg.status] ?? "#94A3B8" }}>
                    {msg.status}
                  </span>
                  <span className="font-bold truncate" style={{ color: "#1E293B" }}>{msg.subject}</span>
                </div>
                <p className="mt-0.5 text-xs" style={{ color: "#94A3B8" }}>
                  {msg.name} · {msg.email} · {formatRelativeDate(msg.createdAt)}
                </p>
              </div>
            </button>

            {expanded === msg.id && (
              <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "rgba(226,232,240,0.60)" }}>
                <p className="text-sm leading-6 whitespace-pre-wrap" style={{ color: "#475569" }}>{msg.message}</p>
                {msg.status !== "resolved" && (
                  <button
                    onClick={() => resolve(msg.id)}
                    disabled={resolving === msg.id}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
                    style={{ background: "rgba(127,182,133,0.15)", color: "#5A9460" }}
                  >
                    {resolving === msg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Mark resolved
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Pagination skip={skip} take={take} total={total} onPage={setSkip} />
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ skip, take, total, onPage }: { skip: number; take: number; total: number; onPage: (s: number) => void }) {
  const page = Math.floor(skip / take) + 1;
  const pages = Math.ceil(total / take);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <button disabled={page <= 1} onClick={() => onPage(skip - take)}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40"
        style={{ background: "rgba(255,255,255,0.90)", border: "1px solid rgba(226,232,240,0.70)", color: "#475569" }}>
        <ChevronLeft className="h-4 w-4" /> Prev
      </button>
      <span className="text-sm font-semibold" style={{ color: "#64748B" }}>Page {page} of {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(skip + take)}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40"
        style={{ background: "rgba(255,255,255,0.90)", border: "1px solid rgba(226,232,240,0.70)", color: "#475569" }}>
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: "overview", icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview" },
  { tab: "users", icon: <Users className="h-4 w-4" />, label: "Users" },
  { tab: "listings", icon: <Package className="h-4 w-4" />, label: "Listings" },
  { tab: "reports", icon: <AlertTriangle className="h-4 w-4" />, label: "Reports" },
  { tab: "events", icon: <CalendarDays className="h-4 w-4" />, label: "Events" },
  { tab: "messages", icon: <Inbox className="h-4 w-4" />, label: "Messages" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <AdminGate>
      <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #FAF7F2 0%, #F0F7F1 100%)" }}>
        <div className="container-shell py-6 md:py-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.20)" }}>
              <Shield className="h-3 w-3" /> Admin panel
            </div>
            <h1 className="mt-2 text-2xl font-black" style={{ color: "#1E293B" }}>Platform management</h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            {/* ── Sidebar ── */}
            <nav className="flex flex-row gap-1 overflow-x-auto pb-1 scrollbar-hide lg:flex-col lg:overflow-visible lg:pb-0">
              {NAV_ITEMS.map(({ tab: t, icon, label }) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="inline-flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold transition-all"
                  style={{
                    background: tab === t ? "#0F172A" : "rgba(255,255,255,0.80)",
                    color: tab === t ? "#fff" : "#475569",
                    border: tab === t ? "none" : "1px solid rgba(226,232,240,0.60)",
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </nav>

            {/* ── Content ── */}
            <main>
              {tab === "overview" && <OverviewTab />}
              {tab === "users" && <UsersTab />}
              {tab === "listings" && <ListingsTab />}
              {tab === "reports" && <ReportsTab />}
              {tab === "events" && <EventsTab />}
              {tab === "messages" && <MessagesTab />}
            </main>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
